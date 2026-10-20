/**
 * On-device Library: saved downloads live in THIS browser's IndexedDB, never
 * on a server. Every save streams the file once through the same-origin
 * proxy, validates the bytes, and stores the file under its original title.
 *
 * Memory model: chunks are wrapped into Blob parts as they arrive, so a 200
 * MB video never sits on the JS heap — it lives in the browser's blob store.
 *
 * Nothing here runs during SSR: every entry point bails out when
 * `indexedDB` is missing (private mode, blocked storage), and the UI degrades
 * to a plain browser download.
 */
import type { Platform } from "@/lib/platforms";

const DB_NAME = "lamptik-library";
const DB_VERSION = 1;
const ITEMS = "items";
const PARTS = "parts";

/** Hard ceiling for a buffered save: beyond this the plain download path is
 *  used (FB Watch uploads can exceed 1 GB, and we never buffer those). */
export const MAX_BUFFER_BYTES = 1_500_000_000;
/** Refuse to keep a copy bigger than half of the reported storage quota. */
export const QUOTA_HEADROOM = 0.5;

export type SaveKind = "hd" | "sd" | "audio";

export interface LibraryItem {
  key: string;
  title: string;
  filename: string;
  platform: Platform;
  kind: SaveKind;
  bytes: number;
  parts: number;
  mime: string;
  ext: string;
  thumbnail: string | null;
  author: string;
  duration: number;
  canonicalUrl: string | null;
  savedAt: number;
}

export type LibraryErrorCode =
  | "HTTP"
  | "TYPE"
  | "SNIFF"
  | "TRUNCATED"
  | "CORRUPT"
  | "QUOTA"
  | "TOO_LARGE"
  | "UNSUPPORTED"
  | "NETWORK";

export class LibraryError extends Error {
  readonly code: LibraryErrorCode;
  readonly hint: string | undefined;

  constructor(code: LibraryErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "LibraryError";
    this.code = code;
    this.hint = hint;
  }
}

export function libraryAvailable(): boolean {
  return typeof indexedDB !== "undefined" && typeof fetch === "function";
}

/** Tiny change bus so the header badge updates the moment a save lands. */
export const libraryBus: EventTarget | null =
  typeof window !== "undefined" && typeof EventTarget !== "undefined" ? new EventTarget() : null;

export function notifyLibraryChanged(): void {
  libraryBus?.dispatchEvent(new Event("change"));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new LibraryError("UNSUPPORTED", "Offline storage is unavailable."));
  }
  if (!dbPromise) {
    dbPromise = openVersioned(DB_VERSION).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

function openVersioned(version: number): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ITEMS)) {
        db.createObjectStore(ITEMS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(PARTS)) {
        db.createObjectStore(PARTS);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Self-heal: a database can exist at this version with no stores (a
      // partial init, or another script creating the name first). Without
      // this the Library would silently stop persisting for that browser
      // forever, because `onupgradeneeded` never fires again.
      const complete = db.objectStoreNames.contains(ITEMS) && db.objectStoreNames.contains(PARTS);
      if (complete) {
        resolve(db);
        return;
      }
      const next = db.version + 1;
      db.close();
      openVersioned(next).then(resolve, reject);
    };
    request.onerror = () => reject(request.error ?? new LibraryError("UNSUPPORTED", "Storage failed."));
    request.onblocked = () => reject(new LibraryError("UNSUPPORTED", "Storage is blocked."));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new LibraryError("UNSUPPORTED", "Storage operation failed."));
  });
}

/** Read all metadata, newest first. */
export async function listLibrary(): Promise<LibraryItem[]> {
  try {
    const db = await openDb();
    const store = db.transaction(ITEMS).objectStore(ITEMS);
    const items = await request<LibraryItem[]>(store.getAll());
    return items.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function libraryCount(): Promise<number> {
  try {
    const db = await openDb();
    const store = db.transaction(ITEMS).objectStore(ITEMS);
    return await request<number>(store.count());
  } catch {
    return 0;
  }
}

/** Assemble a stored file back into one Blob, in part order. */
export async function readLibraryBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    const item = await request<LibraryItem | undefined>(
      db.transaction(ITEMS).objectStore(ITEMS).get(key),
    );
    if (!item) return null;
    const parts: Blob[] = [];
    for (let index = 0; index < item.parts; index += 1) {
      const part = await request<Blob | undefined>(
        db.transaction(PARTS).objectStore(PARTS).get(partKey(key, index)),
      );
      if (!part) return null;
      parts.push(part);
    }
    return new Blob(parts, { type: item.mime });
  } catch {
    return null;
  }
}

export async function deleteLibraryItem(key: string): Promise<void> {
  const db = await openDb();
  const item = await request<LibraryItem | undefined>(
    db.transaction(ITEMS).objectStore(ITEMS).get(key),
  );
  const partsCount = item?.parts ?? 0;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([ITEMS, PARTS], "readwrite");
    const partsStore = transaction.objectStore(PARTS);
    for (let index = 0; index < partsCount; index += 1) {
      partsStore.delete(partKey(key, index));
    }
    transaction.objectStore(ITEMS).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("aborted"));
  });
}

export async function clearLibrary(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([ITEMS, PARTS], "readwrite");
    transaction.objectStore(PARTS).clear();
    transaction.objectStore(ITEMS).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("aborted"));
  });
}

/** Best-effort storage figures for the "kept on this device" line. */
export async function libraryUsage(): Promise<{ usage: number | null; quota: number | null }> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return { usage: null, quota: null };
    }
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? null, quota: estimate.quota ?? null };
  } catch {
    return { usage: null, quota: null };
  }
}

function partKey(key: string, index: number): string {
  return `${key}#${index}`;
}

/* ---------------------------------------------------------------------------
   Streaming save: fetch once, validate the bytes, keep a copy, hand the file
   to the browser under its ORIGINAL title.
--------------------------------------------------------------------------- */

/** ~4 MB parts: few enough IndexedDB writes, small enough to stay off-heap. */
const PART_BYTES = 4 * 1024 * 1024;
const PROGRESS_INTERVAL_MS = 120;

export interface SaveProgress {
  loaded: number;
  /** Null when the server didn't send a length — the UI shows a size, not a
   *  percentage, so we never fabricate a number. */
  total: number | null;
}

export interface SaveRequest {
  url: string;
  id: string;
  title: string;
  platform: Platform;
  kind: SaveKind;
  expectedBytes: number | null;
  thumbnail?: string | null;
  author?: string;
  duration?: number;
  canonicalUrl?: string | null;
  signal?: AbortSignal;
  onProgress?: (progress: SaveProgress) => void;
}

export interface SaveResult {
  /** Library key, or null when the file was delivered but not kept offline
   *  (private mode, quota, or over the buffer ceiling). */
  key: string | null;
  filename: string;
  bytes: number;
  persisted: boolean;
}

/** Files bigger than this are streamed by the browser itself (no buffering). */
export function shouldBuffer(declaredLength: number | null): boolean {
  return declaredLength === null || declaredLength <= MAX_BUFFER_BYTES;
}

export async function saveToLibrary(request: SaveRequest): Promise<SaveResult> {
  const { url, id, title, platform, kind, expectedBytes, signal } = request;
  const key = `${platform}:${id}:${kind}`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", cache: "no-store", signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new LibraryError("NETWORK", "The media connection dropped.", "Check your connection and retry.");
  }

  if (!response.ok) {
    throw new LibraryError(
      "HTTP",
      response.status === 429
        ? "Too many downloads in a row."
        : "That media link is no longer valid.",
      response.status === 429 ? "Wait a few seconds, then fetch the video again." : "Fetch the video again for a fresh link.",
    );
  }

  const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!isMediaMime(mime)) {
    throw new LibraryError(
      "TYPE",
      "That link isn’t serving a media file.",
      "Fetch the video again, then retry the download.",
    );
  }

  const encoding = (response.headers.get("content-encoding") ?? "").toLowerCase();
  const lengthHeader = response.headers.get("content-length");
  const declared = lengthHeader && encoding !== "gzip" && encoding !== "deflate" && encoding !== "br"
    ? Number(lengthHeader)
    : null;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new LibraryError("UNSUPPORTED", "This browser can’t stream the file.", "Try a different browser.");
  }

  const parts: Blob[] = [];
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;
  let loaded = 0;
  let head: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  let lastEmit = 0;

  const flush = (force: boolean) => {
    while (pendingBytes >= PART_BYTES || (force && pending.length > 0)) {
      const next = new Uint8Array(Math.min(PART_BYTES, pendingBytes));
      let offset = 0;
      while (offset < next.length) {
        const chunk = pending[0];
        const take = Math.min(chunk.length, next.length - offset);
        next.set(take === chunk.length ? chunk : chunk.subarray(0, take), offset);
        offset += take;
        if (take === chunk.length) pending.shift();
        else pending[0] = chunk.subarray(take);
      }
      pendingBytes -= next.length;
      parts.push(new Blob([next as unknown as BlobPart]));
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.length === 0) continue;
      loaded += value.length;
      if (head.length < 64) {
        head = head.length === 0 ? value.slice(0, 64) : concatHead(head, value, 64);
      }
      pending.push(value);
      pendingBytes += value.length;
      flush(false);
      // Throttled: a 500 MB stream would otherwise re-render React on every
      // network chunk. The final tick always fires below.
      const now = Date.now();
      if (now - lastEmit >= PROGRESS_INTERVAL_MS) {
        lastEmit = now;
        request.onProgress?.({ loaded, total: declared });
      }
    }
    flush(true);
    request.onProgress?.({ loaded, total: declared });
  } catch (error) {
    // A cancelled or broken stream leaves nothing in storage: parts were
    // never written, so there is nothing to clean up and no corrupt file.
    void reader.cancel().catch(() => undefined);
    throw error;
  }

  validateBytes({ head, loaded, declared, expectedBytes, mime, kind });

  const ext = extensionFor(mime, kind);
  const filename = `${sanitizeFilename(title, key)}.${ext}`;
  const blob = new Blob(parts as unknown as BlobPart[], { type: mime });

  let persisted = false;
  let persistedKey: string | null = null;
  try {
    const quotaOk = await fitsQuota(loaded);
    if (quotaOk && libraryAvailable()) {
      await writeRecord({
        key,
        title,
        filename,
        platform,
        kind,
        bytes: loaded,
        parts: parts.length,
        mime,
        ext,
        thumbnail: request.thumbnail ?? null,
        author: request.author ?? "",
        duration: request.duration ?? 0,
        canonicalUrl: request.canonicalUrl ?? null,
        savedAt: Date.now(),
      }, parts);
      persisted = true;
      persistedKey = key;
    }
  } catch {
    // Quota hit or storage blocked: the file is still delivered below, we
    // just can't promise an offline copy.
    persisted = false;
    persistedKey = null;
  }

  deliverBlob(blob, filename);
  return { key: persistedKey, filename, bytes: loaded, persisted };
}

function writeRecord(item: LibraryItem, parts: Blob[]): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([ITEMS, PARTS], "readwrite");
        const partsStore = transaction.objectStore(PARTS);
        parts.forEach((part, index) => partsStore.put(part, partKey(item.key, index)));
        transaction.objectStore(ITEMS).put(item);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("storage failed"));
        transaction.onabort = () => reject(transaction.error ?? new Error("aborted"));
      }),
  );
}

/** ------------------------------------------------------------------------
 *  Integrity gates — nothing that isn’t a real media file ever reaches the
 *  Library or the user’s disk.
 * ------------------------------------------------------------------------ */
function validateBytes(args: {
  head: Uint8Array;
  loaded: number;
  declared: number | null;
  expectedBytes: number | null;
  mime: string;
  kind: SaveKind;
}): void {
  const { head, loaded, declared, expectedBytes, mime, kind } = args;

  if (loaded <= 0) {
    throw new LibraryError("TRUNCATED", "The stream came back empty.", "Fetch the video again.");
  }
  if (head.length > 0 && (head[0] === 0x7b || head[0] === 0x5b || head[0] === 0x3c)) {
    throw new LibraryError("SNIFF", "The server replied with an error page, not a video.", "Fetch the video again.");
  }
  if (declared !== null && loaded !== declared) {
    throw new LibraryError("TRUNCATED", "The file was cut short mid-download.", "Retry — we won’t keep a partial file.");
  }
  if (expectedBytes !== null && expectedBytes > 0 && loaded < expectedBytes * 0.5) {
    throw new LibraryError("TRUNCATED", "The file stopped before it finished.", "Retry to get the complete file.");
  }
  if (kind !== "audio" && mime.startsWith("video/") && !looksLikeMp4(head)) {
    throw new LibraryError("CORRUPT", "That stream isn’t a valid MP4.", "Fetch the video again for a clean source.");
  }
  if (kind === "audio" && mime.startsWith("audio/") && !looksLikeAudio(head)) {
    throw new LibraryError("CORRUPT", "That stream isn’t a valid audio file.", "Fetch the video again.");
  }
}

function looksLikeMp4(head: Uint8Array): boolean {
  const signature = (offset: number) => String.fromCharCode(...head.slice(offset, offset + 4));
  if (signature(4) === "ftyp" || signature(4) === "styp") return true;
  for (let i = 0; i <= head.length - 4; i += 1) {
    const box = signature(i);
    if (box === "moov" || box === "mdat" || box === "free") return true;
  }
  return false;
}

function looksLikeAudio(head: Uint8Array): boolean {
  if (head.length >= 3 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) return true; // ID3
  if (head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return true; // MPEG frame sync
  if (head.length >= 4 && signatureAt(head, 4, 0) === "ftyp") return true; // m4a/AAC in MP4
  return false;
}

function signatureAt(bytes: Uint8Array, length: number, offset: number): string {
  let out = "";
  for (let i = offset; i < offset + length && i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function concatHead(
  current: Uint8Array<ArrayBufferLike>,
  next: Uint8Array<ArrayBufferLike>,
  limit: number,
): Uint8Array<ArrayBuffer> {
  const needed = limit - current.length;
  const merged = new Uint8Array(limit);
  merged.set(current, 0);
  merged.set(next.subarray(0, needed), current.length);
  return merged;
}

function isMediaMime(mime: string): boolean {
  return (
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/octet-stream"
  );
}

function extensionFor(mime: string, kind: SaveKind): string {
  if (mime.includes("mp4") || mime.includes("m4v")) return "mp4";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("mp4a") || mime.includes("aac")) return "m4a";
  return kind === "audio" ? "mp3" : "mp4";
}

/** Windows/Android reserve these regardless of extension. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Keep the creator's wording, strip anything a file system would reject. */
export function sanitizeFilename(title: string, fallback: string): string {
  const cleaned = title
    .normalize("NFKC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    // Reserved on Windows, FAT, Android and macOS. `:` also protects against
    // a title that would otherwise become an alternate data stream.
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    // Trim again after the slice: cutting at 90 chars can leave a trailing
    // dot or space, and Windows silently drops those (or refuses the save).
    .slice(0, 90)
    .replace(/[\s.]+$/, "")
    .trim();
  const usable = RESERVED_NAMES.test(cleaned) ? `${cleaned} video` : cleaned;
  return usable.length >= 3 ? usable : fallback.replace(/[^\w-]/g, "").slice(0, 40) || "lamptik-video";
}

async function fitsQuota(bytes: number): Promise<boolean> {
  if (!libraryAvailable()) return false;
  const { quota, usage } = await libraryUsage();
  if (quota === null || usage === null) return libraryAvailable();
  return bytes * 2 < quota - usage || bytes * QUOTA_HEADROOM < quota - usage;
}

/** Hand the bytes to the browser with the original title as file name. */
function deliverBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Large saves stream for minutes: keep the URL alive well past the click.
  window.setTimeout(() => URL.revokeObjectURL(url), 15 * 60 * 1000);
}

/** Re-export a stored item with its original title as the file name. */
export async function exportLibraryItem(key: string): Promise<void> {
  const item = await openDb().then(
    (db) => request<LibraryItem | undefined>(db.transaction(ITEMS).objectStore(ITEMS).get(key)),
  );
  if (!item) throw new LibraryError("HTTP", "That saved file is gone.", "Fetch it again.");
  const blob = await readLibraryBlob(key);
  if (!blob) throw new LibraryError("HTTP", "That saved file is unreadable.", "Fetch it again.");
  deliverBlob(blob, item.filename);
}
