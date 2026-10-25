import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

/**
 * In-flow sponsor placeholder.
 *
 * Deliberately a normal block in the scroll flow — never an overlay and never
 * an interstitial — so it can never cover the Download button.
 */
export function SponsorSlot({ label = "Sponsored" }: { label?: string }) {
  return (
    <View style={styles.slot} accessibilityRole="summary">
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>Your ad unit renders here — in flow, never over the download button.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel,
    gap: 6,
  },
  label: {
    color: theme.textDim,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  body: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
