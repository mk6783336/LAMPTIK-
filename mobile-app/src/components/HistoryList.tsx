import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { HistoryEntry } from "../lib/history";
import { theme } from "../theme";

function when(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface HistoryListProps {
  entries: HistoryEntry[];
  onClear: () => void;
  onOpen: (entry: HistoryEntry) => void;
}

export function HistoryList({ entries, onClear, onOpen }: HistoryListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nothing downloaded yet</Text>
        <Text style={styles.emptyBody}>
          Every file you save shows up here with its title, quality and the local copy kept on this phone.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.count}>{entries.length} saved</Text>
        <Pressable onPress={onClear} accessibilityRole="button">
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      </View>

      {entries.map((entry) => (
        <Pressable
          key={entry.uri}
          onPress={() => onOpen(entry)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          {entry.thumbnail ? (
            <Image source={{ uri: entry.thumbnail }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={2}>
              {entry.title}
            </Text>
            <Text style={styles.meta}>
              {entry.quality === "audio" ? "MP3" : entry.quality.toUpperCase()} · {entry.platform} ·{" "}
              {when(entry.savedAt)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 10 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  count: { color: theme.textMuted, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" },
  clear: { color: theme.danger, fontSize: 12, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel,
  },
  rowPressed: { backgroundColor: theme.panelStrong },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: theme.field },
  thumbFallback: { opacity: 0.6 },
  text: { flex: 1, gap: 4 },
  title: { color: theme.text, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  meta: { color: theme.textDim, fontSize: 11 },
  empty: {
    marginTop: 24,
    padding: 20,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.line,
    gap: 6,
  },
  emptyTitle: { color: theme.text, fontSize: 15, fontWeight: "700" },
  emptyBody: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
});
