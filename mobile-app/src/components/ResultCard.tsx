import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { qualityAvailable } from "../lib/api";
import type { MediaPayload, Quality } from "../lib/types";
import { theme } from "../theme";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

const QUALITIES: Array<{ key: Quality; label: string; hint: string }> = [
  { key: "hd", label: "1080p MP4", hint: "Best quality" },
  { key: "sd", label: "720p MP4", hint: "Smaller file" },
  { key: "audio", label: "MP3 audio", hint: "Sound only" },
];

interface ResultCardProps {
  media: MediaPayload;
  quality: Quality;
  onQualityChange: (quality: Quality) => void;
  onDownload: () => void;
  downloading: boolean;
  progress: number;
  error: string | null;
  savedNote: string | null;
}

export function ResultCard({
  media,
  quality,
  onQualityChange,
  onDownload,
  downloading,
  progress,
  error,
  savedNote,
}: ResultCardProps) {
  const size = quality === "sd" ? formatBytes(media.videoSdBytes) : formatBytes(media.videoHdBytes);

  return (
    <View style={styles.card}>
      {media.thumbnail ? (
        <Image source={{ uri: media.thumbnail }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbGlyph}>⚡</Text>
        </View>
      )}

      <Text style={styles.title} numberOfLines={3}>
        {media.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {media.author} · {formatDuration(media.duration)} · {media.platform.toUpperCase()}
        {size && quality !== "audio" ? ` · ${size}` : ""}
      </Text>

      <View style={styles.qualityRow}>
        {QUALITIES.map((item) => {
          const enabled = qualityAvailable(media, item.key);
          const active = quality === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onQualityChange(item.key)}
              disabled={!enabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !enabled }}
              style={[
                styles.quality,
                active && styles.qualityActive,
                !enabled && styles.qualityDisabled,
              ]}
            >
              <Text style={[styles.qualityLabel, active && styles.qualityLabelActive]}>{item.label}</Text>
              <Text style={styles.qualityHint}>{enabled ? item.hint : "Not offered"}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onDownload}
        disabled={downloading || !qualityAvailable(media, quality)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.download,
          (downloading || !qualityAvailable(media, quality)) && styles.downloadBusy,
          pressed && !downloading && styles.downloadPressed,
        ]}
      >
        <Text style={styles.downloadText}>
          {downloading ? `Downloading ${Math.round(progress * 100)}%` : "⬇  Download to phone"}
        </Text>
      </Pressable>

      {downloading ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(3, Math.round(progress * 100))}%` }]} />
        </View>
      ) : null}

      {savedNote ? <Text style={styles.saved}>{savedNote}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel,
    gap: 10,
  },
  thumb: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: theme.field },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  thumbGlyph: { color: theme.textDim, fontSize: 32 },
  title: { color: theme.text, fontSize: 16, fontWeight: "700", lineHeight: 22 },
  meta: { color: theme.textMuted, fontSize: 12 },
  qualityRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  quality: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.field,
    alignItems: "center",
    gap: 2,
  },
  qualityActive: { borderColor: theme.accent, backgroundColor: `${theme.accent}1a` },
  qualityDisabled: { opacity: 0.4 },
  qualityLabel: { color: theme.text, fontSize: 12, fontWeight: "700" },
  qualityLabelActive: { color: theme.accent },
  qualityHint: { color: theme.textDim, fontSize: 10 },
  download: {
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  downloadBusy: { opacity: 0.7 },
  downloadPressed: { opacity: 0.85 },
  downloadText: { color: theme.accentInk, fontSize: 15, fontWeight: "800" },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.field,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: theme.ok },
  saved: { color: theme.ok, fontSize: 12 },
  error: { color: theme.danger, fontSize: 12, lineHeight: 18 },
});
