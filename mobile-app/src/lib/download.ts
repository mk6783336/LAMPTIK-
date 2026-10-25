import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ""}lamptik/`;

export interface DownloadOutcome {
  /** Local file URI the app keeps in history. */
  uri: string;
  /** True when the file also landed in the phone's gallery. */
  savedToGallery: boolean;
}

function safeName(input: string, fallback: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : fallback;
}

function extensionFor(url: string, quality: "hd" | "sd" | "audio"): string {
  if (quality === "audio") return "mp3";
  const path = url.split("?")[0] ?? "";
  const match = path.match(/\.(mp4|m4v|webm|mov)$/i);
  return match?.[1]?.toLowerCase() ?? "mp4";
}

async function ensureDir(): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

async function saveToGallery(uri: string): Promise<boolean> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return false;
    await MediaLibrary.createAssetAsync(uri);
    return true;
  } catch {
    // A denied gallery permission must not lose the downloaded file: it stays
    // in the app sandbox and remains playable from History.
    return false;
  }
}

/**
 * Stream a resolved media URL to the device with real progress.
 *
 * `expo-file-system`'s resumable downloader is used (not `fetch` + blob) so a
 * 200 MB video never has to sit in JS memory: bytes go straight to disk, which
 * is also what makes the progress bar honest.
 */
export async function downloadMedia(args: {
  url: string;
  title: string;
  quality: "hd" | "sd" | "audio";
  onProgress?: (ratio: number) => void;
}): Promise<DownloadOutcome> {
  const { url, title, quality, onProgress } = args;

  if (!FileSystem.documentDirectory) {
    throw new Error("This device has no writable storage for downloads.");
  }

  await ensureDir();
  const name = safeName(title, "lamptik-video");
  const target = `${DOWNLOAD_DIR}${name}-${Date.now()}.${extensionFor(url, quality)}`;

  const resumable = FileSystem.createDownloadResumable(
    url,
    target,
    { headers: { Accept: "*/*" } },
    (progress) => {
      const total = progress.totalBytesExpectedToWrite;
      if (onProgress && total > 0) {
        onProgress(Math.min(1, progress.totalBytesWritten / total));
      }
    },
  );

  const result = await resumable.downloadAsync();
  if (!result?.uri) {
    throw new Error("The download did not finish. Check your connection and retry.");
  }

  onProgress?.(1);
  const savedToGallery = await saveToGallery(result.uri);
  return { uri: result.uri, savedToGallery };
}
