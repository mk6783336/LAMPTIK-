import { cacheGet, cacheSet } from "@/lib/cache";
import { DESKTOP_UA } from "@/lib/http";

/**
 * MP4 compatibility prober.
 *
 * Universal playback (Android/iOS galleries, WhatsApp status, editors) needs a
 * *progressive* H.264 + AAC MP4 whose `moov` atom sits before `mdat`. The
 * extraction pipeline uses this prober to reject HEVC (`hvc1`/`hev1`), AV1,
 * and video-only DASH renditions before a download link is ever shown.
 *
 * It costs one small HTTP Range request (two only when `moov` lives at the
 * tail of the file) and the verdict is cached per video id — the codec of a
 * given rendition never changes, so repeat resolves stay instant.
 */

/**
 * `vp9`/`vp8` matter: Facebook serves some "HD" renditions as VP9-in-MP4
 * (`vp09` sample entry). Chrome plays them; iOS galleries and WhatsApp show a
 * black frame — the exact corruption report this prober exists to prevent.
 */
export type Mp4Codec = "h264" | "hevc" | "av1" | "vp9" | "vp8" | "unknown";

export interface Mp4Probe {
  reachable: boolean;
  status: number;
  contentType: string | null;
  /** Full file size in bytes when the CDN reports it. */
  byteSize: number | null;
  codec: Mp4Codec;
  /** `moov` before `mdat` — metadata at the front, instant playback start. */
  faststart: boolean;
  /** `true`/`false` only when the moov atom was actually inspected. */
  hasAudio: boolean | null;
  /** A valid `ftyp` box was seen at the start of the file. */
  ftyp: boolean;
  /**
   * Accepted under the late-`moov` rule (see `allowLateMoov`): a Facebook
   * progressive MP4 whose `moov` sits at the tail, verified by `ftyp` +
   * `video/mp4` instead of a front `moov`. Never set without the opt-in.
   */
  lateMoovAccepted: boolean;
}

export interface CompatibleStream {
  url: string;
  byteSize: number | null;
  codec: Mp4Codec;
  faststart: boolean;
  hasAudio: boolean | null;
}

const WINDOW_BYTES = 192 * 1024;
const PROBE_TTL_MS = 10 * 60 * 1_000;

interface WindowRead {
  bytes: Uint8Array;
  status: number;
  contentType: string | null;
  /** Absolute file offset of the first byte we received. */
  offset: number;
  /** Total size of the remote file, when advertised. */
  totalBytes: number | null;
}

interface WindowInspection {
  /** Absolute offset of the moov atom, or -1. */
  moov: number;
  /** Absolute offset of the mdat atom, or -1. */
  mdat: number;
  codec: Mp4Codec;
  hasAudio: boolean | null;
  /** Valid `ftyp` box at the very start of the file. */
  ftyp: boolean;
  /** `ftyp` compatible brands name a phone-hostile codec (HEVC/AV1/VP9). */
  ftypBadCodec: boolean;
}

const EMPTY_PROBE: Mp4Probe = {
  reachable: false,
  status: 0,
  contentType: null,
  byteSize: null,
  codec: "unknown",
  faststart: false,
  hasAudio: null,
  ftyp: false,
  lateMoovAccepted: false,
};

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (offset < 0 || offset + text.length > bytes.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function asciiIndex(bytes: Uint8Array, text: string, from = 0): number {
  const last = bytes.length - text.length;
  for (let index = Math.max(0, from); index <= last; index += 1) {
    if (asciiAt(bytes, index, text)) return index;
  }
  return -1;
}

function toInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseTotalSize(headers: Headers, status: number): number | null {
  const contentRange = headers.get("content-range");
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)\s*$/);
    const total = toInt(match?.[1] ?? null);
    if (total) return total;
  }
  if (status === 200) return toInt(headers.get("content-length"));
  return null;
}

function parseRangeOffset(headers: Headers, status: number): number {
  if (status !== 206) return 0;
  const match = headers.get("content-range")?.match(/bytes\s+(\d+)-/i);
  const start = toInt(match?.[1] ?? null);
  return start ?? 0;
}

/** Read at most `maxBytes` of a ranged response, then close the connection. */
async function readWindow(
  url: string,
  range: string,
  maxBytes: number,
  options: { referer: string; signal?: AbortSignal; timeoutMs: number },
): Promise<WindowRead | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "*/*",
        "Accept-Encoding": "identity",
        Range: range,
        Referer: options.referer,
        "User-Agent": DESKTOP_UA,
      },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.body) {
      return {
        bytes: new Uint8Array(0),
        status: response.status,
        contentType: response.headers.get("content-type"),
        offset: parseRangeOffset(response.headers, response.status),
        totalBytes: parseTotalSize(response.headers, response.status),
      };
    }

    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      total += value.byteLength;
    }

    const bytes = new Uint8Array(total);
    let cursor = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, cursor);
      cursor += chunk.byteLength;
    }

    return {
      bytes,
      status: response.status,
      contentType: response.headers.get("content-type"),
      offset: parseRangeOffset(response.headers, response.status),
      totalBytes: parseTotalSize(response.headers, response.status),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
    // Cancelling after a completed read is a no-op; on early exit it closes
    // the socket instead of draining the rest of a 500 MB file.
    await reader?.cancel().catch(() => undefined);
  }
}

function inspectWindow(bytes: Uint8Array, baseOffset: number): WindowInspection {
  const moovIndex = asciiIndex(bytes, "moov");
  const mdatIndex = asciiIndex(bytes, "mdat");

  // `ftyp` is only meaningful at file offset 4 (size + "ftyp" + brands).
  // A ranged re-request that starts mid-file must never claim it.
  const ftyp = baseOffset === 0 && bytes.length >= 8 && asciiAt(bytes, 4, "ftyp");
  // Compatible brands live right after the major brand (offset 16+). When
  // the file only exposes ftyp + mdat in the first window, these brands are
  // the only codec signal available — treat an HEVC/AV1/VP9-only brand list
  // as hostile, exactly like a moov verdict would.
  const brandWindow = ftyp ? bytes.slice(16, Math.min(bytes.length, 64)) : null;
  const brandHas = (text: string) => (brandWindow ? asciiIndex(brandWindow, text) >= 0 : false);
  const ftypBadCodec =
    ftyp &&
    (brandHas("hvc1") ||
      brandHas("hev1") ||
      brandHas("av01") ||
      brandHas("vp09") ||
      brandHas("vp08")) &&
    !brandHas("avc1") &&
    !brandHas("avc3") &&
    !brandHas("mp41") &&
    !brandHas("isom");

  // Only look for the codec/audio fourccs inside the moov atom. `avc1` can
  // appear as an ftyp compatible brand, which would otherwise mislabel a
  // perfectly valid HEVC file as H.264.
  const scanFrom = moovIndex >= 0 ? moovIndex : 0;
  const h264 = asciiIndex(bytes, "avc1", scanFrom) >= 0 || asciiIndex(bytes, "avc3", scanFrom) >= 0;
  const hevc =
    asciiIndex(bytes, "hvc1", scanFrom) >= 0 ||
    asciiIndex(bytes, "hev1", scanFrom) >= 0 ||
    asciiIndex(bytes, "dvhe", scanFrom) >= 0;
  const av1 = asciiIndex(bytes, "av01", scanFrom) >= 0;
  const vp9 = asciiIndex(bytes, "vp09", scanFrom) >= 0 || asciiIndex(bytes, "vp9 ", scanFrom) >= 0;
  const vp8 = asciiIndex(bytes, "vp08", scanFrom) >= 0 || asciiIndex(bytes, "vp8 ", scanFrom) >= 0;

  let codec: Mp4Codec = "unknown";
  if (h264) codec = "h264";
  else if (hevc) codec = "hevc";
  else if (av1) codec = "av1";
  else if (vp9) codec = "vp9";
  else if (vp8) codec = "vp8";

  const hasAudio =
    moovIndex >= 0
      ? asciiIndex(bytes, "mp4a", scanFrom) >= 0 ||
        asciiIndex(bytes, "ac-3", scanFrom) >= 0 ||
        asciiIndex(bytes, "ec-3", scanFrom) >= 0
      : null;

  return {
    moov: moovIndex >= 0 ? baseOffset + moovIndex : -1,
    mdat: mdatIndex >= 0 ? baseOffset + mdatIndex : -1,
    codec,
    hasAudio,
    ftyp,
    ftypBadCodec,
  };
}

/**
 * Inspect an MP4's first (and, when needed, last) 192 KB to determine codec,
 * audio presence, faststart layout, and file size. Never throws, never
 * downloads the whole file, and never takes longer than `timeoutMs` per
 * window.
 */
/** `video/mp4` (or the equivalent `application/mp4`) response type. */
function isMp4ContentType(contentType: string | null): boolean {
  const base = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return base === "video/mp4" || base === "application/mp4";
}

export async function probeMp4(
  url: string,
  options: {
    /** Stable key (video id) so the verdict is reused across signed-URL churn. */
    cacheKey?: string;
    /** Platform CDN referer — TikTok/Facebook reject anonymous probes. */
    referer?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    /**
     * Facebook progressive MP4s often place `moov` at the tail of the file
     * or expose only `ftyp` + `mdat` in the first range window. With this
     * opt-in, a 200/206 `video/mp4` response with a valid `ftyp` box is
     * ACCEPTED (`lateMoovAccepted`) even when no `moov` was seen — unless
     * the `ftyp` brands or the moov verdict name a video-only DASH track
     * (HEVC/AV1/VP9) or report no audio. TikTok callers leave this off and
     * keep the strict faststart gate.
     */
    allowLateMoov?: boolean;
  } = {},
): Promise<Mp4Probe> {
  const cacheKey = options.cacheKey ? `mp4:${options.cacheKey}` : null;
  if (cacheKey) {
    const hit = cacheGet<Mp4Probe>(cacheKey);
    if (hit) return hit;
  }

  const referer = options.referer ?? "https://www.tiktok.com/";
  const timeoutMs = options.timeoutMs ?? 6_000;

  const head = await readWindow(url, `bytes=0-${WINDOW_BYTES - 1}`, WINDOW_BYTES, {
    referer,
    signal: options.signal,
    timeoutMs,
  });

  if (!head || head.status < 200 || head.status >= 300 || head.bytes.length === 0) {
    return { ...EMPTY_PROBE, status: head?.status ?? 0, contentType: head?.contentType ?? null };
  }

  const headInspection = inspectWindow(head.bytes, head.offset);
  let moov = headInspection.moov;
  let mdat = headInspection.mdat;
  let codec = headInspection.codec;
  let hasAudio = headInspection.hasAudio;

  // `moov` at the tail is common for older encoders. Fetch the tail only when
  // the size is known and the head didn't contain the atom.
  if (moov < 0 && head.totalBytes && head.totalBytes > head.bytes.length) {
    const tail = await readWindow(url, `bytes=-${WINDOW_BYTES}`, WINDOW_BYTES, {
      referer,
      signal: options.signal,
      timeoutMs,
    });
    // A CDN that ignores suffix ranges answers 200 with the *head* again.
    if (tail && tail.status === 206 && tail.bytes.length > 0) {
      const tailInspection = inspectWindow(tail.bytes, tail.offset);
      if (tailInspection.moov >= 0) moov = tailInspection.moov;
      if (tailInspection.mdat >= 0) mdat = tailInspection.mdat;
      if (codec === "unknown") codec = tailInspection.codec;
      if (hasAudio === null) hasAudio = tailInspection.hasAudio;
    }
  }

  const lateMoovAccepted = Boolean(
    options.allowLateMoov &&
    (head.status === 200 || head.status === 206) &&
    isMp4ContentType(head.contentType) &&
    headInspection.ftyp &&
    !headInspection.ftypBadCodec &&
    codec !== "hevc" &&
    codec !== "av1" &&
    codec !== "vp9" &&
    codec !== "vp8" &&
    hasAudio !== false,
  );

  const probe: Mp4Probe = {
    reachable: true,
    status: head.status,
    contentType: head.contentType,
    byteSize: head.totalBytes,
    codec,
    faststart: moov >= 0 && (mdat < 0 || moov < mdat),
    hasAudio,
    ftyp: headInspection.ftyp,
    lateMoovAccepted,
  };

  if (cacheKey) cacheSet(cacheKey, probe, PROBE_TTL_MS);

  return probe;
}

/**
 * Pick the first candidate that is verifiably not HEVC and not a video-only
 * DASH rendition. Returns `null` when nothing could be verified — callers
 * should then fall back to the provider's stated stream rather than failing.
 */
export async function selectUniversalMp4(
  candidates: readonly string[],
  options: {
    cacheKeyPrefix?: string;
    referer?: string;
    signal?: AbortSignal;
    maxProbes?: number;
    timeoutMs?: number;
  } = {},
): Promise<CompatibleStream | null> {
  const unique = [...new Set(candidates.filter(Boolean))].slice(0, options.maxProbes ?? 3);

  // An explicit H.264 verdict always beats an `unknown` one (a 192 KB window
  // can miss a tail `moov`), but an unverifiable stream is still better than
  // no download at all — it is returned as `unknown`, never labelled H.264.
  let unverified: CompatibleStream | null = null;

  for (const [index, url] of unique.entries()) {
    const probe = await probeMp4(url, {
      cacheKey: options.cacheKeyPrefix ? `${options.cacheKeyPrefix}:${index}` : undefined,
      referer: options.referer,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });

    if (!probe.reachable) continue;
    if (
      probe.codec === "hevc" ||
      probe.codec === "av1" ||
      probe.codec === "vp9" ||
      probe.codec === "vp8"
    ) {
      continue;
    }
    if (probe.hasAudio === false) continue;

    const candidate: CompatibleStream = {
      url,
      byteSize: probe.byteSize,
      codec: probe.codec,
      faststart: probe.faststart,
      hasAudio: probe.hasAudio,
    };

    if (probe.codec === "h264") return candidate;
    unverified ??= candidate;
  }

  return unverified;
}
