import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PlatformType } from "./types";

const KEY = "lamptik_history_v1";
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  title: string;
  platform: PlatformType;
  thumbnail: string | null;
  quality: "hd" | "sd" | "audio";
  uri: string;
  savedAt: number;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is HistoryEntry => {
      const candidate = entry as Partial<HistoryEntry> | null;
      return (
        typeof candidate?.id === "string" &&
        typeof candidate.title === "string" &&
        typeof candidate.uri === "string" &&
        typeof candidate.savedAt === "number"
      );
    });
  } catch {
    return [];
  }
}

async function persist(entries: HistoryEntry[]): Promise<HistoryEntry[]> {
  const trimmed = entries.slice(0, MAX_ENTRIES);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full / private mode: the in-memory list still works.
  }
  return trimmed;
}

export async function addHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const existing = await loadHistory();
  // Same file downloaded twice keeps one row, newest first.
  const deduped = existing.filter((item) => item.uri !== entry.uri && item.id !== entry.id);
  return persist([entry, ...deduped]);
}

export async function clearHistory(): Promise<HistoryEntry[]> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  return [];
}
