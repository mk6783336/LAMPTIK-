import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { HistoryList } from "./src/components/HistoryList";
import { ResultCard } from "./src/components/ResultCard";
import { SponsorSlot } from "./src/components/SponsorSlot";
import { UrlCard } from "./src/components/UrlCard";
import { useClipboardWatcher } from "./src/hooks/useClipboardWatcher";
import { useShareIntent } from "./src/hooks/useShareIntent";
import { extractUrl, isSupportedUrl, resolveUrl, streamFor } from "./src/lib/api";
import { downloadMedia } from "./src/lib/download";
import { addHistory, clearHistory, loadHistory, type HistoryEntry } from "./src/lib/history";
import type { MediaPayload, Quality } from "./src/lib/types";
import { theme } from "./src/theme";

type Tab = "download" | "history";
type Source = "clipboard" | "share" | null;

export default function App() {
  const [tab, setTab] = useState<Tab>("download");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<Source>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaPayload | null>(null);
  const [quality, setQuality] = useState<Quality>("hd");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Guards against the clipboard watcher and the share sheet resolving the
  // same link twice in parallel.
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  const runResolve = useCallback(async (rawUrl: string) => {
    const target = extractUrl(rawUrl) ?? rawUrl.trim();
    if (!isSupportedUrl(target)) {
      setResolveError("That link is not from YouTube, TikTok, Instagram or Facebook.");
      return;
    }
    if (inFlight.current === target) return;
    inFlight.current = target;

    setUrl(target);
    setResolving(true);
    setResolveError(null);
    setDownloadError(null);
    setSavedNote(null);
    setMedia(null);

    try {
      const result = await resolveUrl(target);
      setMedia(result.media);
      setQuality(result.media.videoHd ? "hd" : result.media.videoSd ? "sd" : "audio");
      setTab("download");
    } catch (error) {
      const message = error instanceof Error ? error.message : "That video could not be resolved.";
      const hint = (error as { hint?: string }).hint;
      setResolveError(hint ? `${message} ${hint}` : message);
    } finally {
      inFlight.current = null;
      setResolving(false);
    }
  }, []);

  // Shared from YouTube/TikTok/Instagram/Facebook → resolve immediately.
  useShareIntent((incoming) => {
    setSource("share");
    void runResolve(incoming);
  });

  // Copied a link anywhere → it is already in the app.
  useClipboardWatcher(tab === "download", (copied) => {
    setSource("clipboard");
    void runResolve(copied);
  });

  const startDownload = useCallback(async () => {
    if (!media) return;
    const stream = streamFor(media, quality);
    if (!stream) {
      setDownloadError("This video does not offer that format. Pick another quality.");
      return;
    }

    setDownloading(true);
    setProgress(0);
    setDownloadError(null);
    setSavedNote(null);

    try {
      const outcome = await downloadMedia({
        url: stream,
        title: media.title,
        quality,
        onProgress: setProgress,
      });
      const entry: HistoryEntry = {
        id: media.id,
        title: media.title,
        platform: media.platform,
        thumbnail: media.thumbnail,
        quality,
        uri: outcome.uri,
        savedAt: Date.now(),
      };
      setHistory(await addHistory(entry));
      setSavedNote(
        outcome.savedToGallery
          ? "Saved to your gallery. It is also in the History tab."
          : "Saved on your phone. Allow gallery access to see it in Photos too.",
      );
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "The download failed. Please retry.");
    } finally {
      setDownloading(false);
    }
  }, [media, quality]);

  const openHistoryEntry = useCallback(async (entry: HistoryEntry) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(entry.uri, { mimeType: entry.quality === "audio" ? "audio/mpeg" : "video/mp4" });
      } else {
        Alert.alert("Saved file", entry.uri);
      }
    } catch {
      Alert.alert("File moved", "That file is no longer on this device. Download it again from the link.");
    }
  }, []);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>LAMP TIK</Text>
            <Text style={styles.tagline}>Save YouTube, TikTok, Reels &amp; Facebook in HD — no watermark.</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FREE</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(["download", "history"] as Tab[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              style={[styles.tab, tab === item && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                {item === "download" ? "Download" : "History"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "download" ? (
          <>
            <UrlCard
              value={url}
              onChange={setUrl}
              onResolve={() => void runResolve(url)}
              loading={resolving}
              detectedFrom={source}
            />

            {resolving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.accent} />
                <Text style={styles.loadingText}>Finding the best stream…</Text>
              </View>
            ) : null}

            {resolveError ? <Text style={styles.error}>{resolveError}</Text> : null}

            {media ? (
              <ResultCard
                media={media}
                quality={quality}
                onQualityChange={setQuality}
                onDownload={() => void startDownload()}
                downloading={downloading}
                progress={progress}
                error={downloadError}
                savedNote={savedNote}
              />
            ) : null}

            <SponsorSlot />
          </>
        ) : (
          <HistoryList
            entries={history}
            onClear={() => void clearHistory().then(setHistory)}
            onOpen={(entry) => void openHistoryEntry(entry)}
          />
        )}

        <Text style={styles.footer}>
          LampTik is not affiliated with YouTube, TikTok, Instagram or Meta. Download only content you have
          the right to use.
        </Text>
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  brandRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  brand: { color: theme.text, fontSize: 22, fontWeight: "800", letterSpacing: 0.6 },
  tagline: { color: theme.textMuted, fontSize: 12, marginTop: 4, maxWidth: 260, lineHeight: 17 },
  badge: {
    borderWidth: 1,
    borderColor: `${theme.accent}66`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: theme.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  tabs: {
    flexDirection: "row",
    marginTop: 18,
    padding: 4,
    borderRadius: 999,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999 },
  tabActive: { backgroundColor: theme.panelStrong },
  tabText: { color: theme.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: theme.text },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  loadingText: { color: theme.textMuted, fontSize: 13 },
  error: { color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 },
  footer: { color: theme.textDim, fontSize: 11, lineHeight: 17, marginTop: 26 },
});
