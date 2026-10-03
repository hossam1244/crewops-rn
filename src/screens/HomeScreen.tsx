import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { MutationQueue } from "../offline/MutationQueue";

interface Props {
  queue: MutationQueue;
  onCheckIn: (note: string) => void;
  checkIns: { id: string; site: string; note: string; at: number; synced: boolean }[];
}

/** Shift dashboard: today's check-ins and the live queue state. */
export function HomeScreen({ queue, onCheckIn, checkIns }: Props) {
  const [stats, setStats] = useState(queue.snapshot());

  useEffect(() => queue.onChange(() => setStats(queue.snapshot())), [queue]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync queue</Text>
        <Text style={styles.queueLine}>
          {stats.pending} pending · {stats.inflight} sending · {stats.dead} failed
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => queue.flush()}
          accessibilityLabel="Sync now"
        >
          <Text style={styles.buttonText}>Sync now</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Check in</Text>
        <Pressable
          style={styles.button}
          onPress={() => onCheckIn("On site")}
          accessibilityLabel="Check in on site"
        >
          <Text style={styles.buttonText}>Check in on site</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Today</Text>
      {checkIns.length === 0 && <Text style={styles.empty}>No check-ins yet.</Text>}
      {checkIns.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.rowNote}>{item.note}</Text>
          <Text style={item.synced ? styles.synced : styles.pendingText}>
            {item.synced ? "synced" : "pending"}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  queueLine: { color: "#555", fontSize: 14 },
  button: { backgroundColor: "#1A2B4A", borderRadius: 12, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
  section: { fontSize: 14, fontWeight: "700", marginTop: 8, color: "#333" },
  empty: { color: "#888" },
  row: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowNote: { color: "#222" },
  synced: { color: "#2E7D32", fontWeight: "600" },
  pendingText: { color: "#EF6C00", fontWeight: "600" },
});
