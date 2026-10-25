import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { detectPlatform } from "../lib/api";
import { theme } from "../theme";

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

interface UrlCardProps {
  value: string;
  onChange: (value: string) => void;
  onResolve: () => void;
  loading: boolean;
  detectedFrom?: "clipboard" | "share" | null;
}

export function UrlCard({ value, onChange, onResolve, loading, detectedFrom }: UrlCardProps) {
  const platform = detectPlatform(value);
  const canResolve = platform !== null && !loading;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Paste a video link</Text>
        {platform ? <Text style={styles.pill}>{PLATFORM_LABEL[platform] ?? platform}</Text> : null}
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="https://www.youtube.com/watch?v=…"
        placeholderTextColor={theme.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        inputMode="url"
        style={styles.input}
        selectionColor={theme.accent}
      />

      {detectedFrom ? (
        <Text style={styles.detected}>
          {detectedFrom === "share"
            ? "Link received from the share sheet."
            : "Link picked up from your clipboard."}
        </Text>
      ) : null}

      <Pressable
        onPress={onResolve}
        disabled={!canResolve}
        accessibilityRole="button"
        accessibilityLabel="Resolve video"
        style={({ pressed }) => [
          styles.button,
          !canResolve && styles.buttonDisabled,
          pressed && canResolve && styles.buttonPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.accentInk} />
        ) : (
          <Text style={styles.buttonText}>⚡ Resolve video</Text>
        )}
      </Pressable>

      <Text style={styles.hint}>
        Copy a link in YouTube, TikTok, Instagram or Facebook and it appears here automatically. Nothing
        is stored on our servers.
      </Text>
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
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: theme.text, fontSize: 15, fontWeight: "600" },
  pill: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    borderWidth: 1,
    borderColor: `${theme.accent}55`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
  },
  input: {
    color: theme.text,
    backgroundColor: theme.field,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  detected: { color: theme.ok, fontSize: 12 },
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: theme.field },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: theme.accentInk, fontSize: 15, fontWeight: "700" },
  hint: { color: theme.textDim, fontSize: 12, lineHeight: 18 },
});
