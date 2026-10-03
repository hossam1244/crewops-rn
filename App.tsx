import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Provider, useDispatch, useSelector } from "react-redux";

import { HomeScreen } from "./src/screens/HomeScreen";
import { IncidentsScreen } from "./src/screens/IncidentsScreen";
import {
  createAsyncStorageAdapter,
  MutationQueue,
  type Sender,
} from "./src/offline/MutationQueue";
import { checkInRecorded, checkInSynced } from "./src/store/checkinsSlice";
import { store, type RootState } from "./src/store/store";

/** Replace with your CrewOps backend; the queue only needs a sender. */
const sender: Sender = async (mutation) => {
  await fetch("https://api.crewops.example/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mutation),
  }).then((response) => {
    if (!response.ok) throw new Error(`sync failed: ${response.status}`);
  });
};

function CrewOps() {
  const dispatch = useDispatch();
  const checkIns = useSelector((state: RootState) => state.checkins.items);
  const [tab, setTab] = useState<"home" | "incidents">("home");

  const queue = useMemo(
    () =>
      new MutationQueue({
        storage: createAsyncStorageAdapter(AsyncStorage),
        sender,
      }),
    [],
  );

  useEffect(() => {
    queue.restore().then(() => queue.flush());
    return queue.onChange(() => {
      // A drained mutation flips its local record to synced.
      const stats = queue.snapshot();
      if (stats.pending === 0 && stats.inflight === 0) {
        checkIns
          .filter((item) => !item.synced)
          .forEach((item) => dispatch(checkInSynced(item.id)));
      }
    });
  }, [queue, checkIns, dispatch]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CrewOps</Text>
      </View>
      {tab === "home" ? (
        <HomeScreen
          queue={queue}
          checkIns={checkIns}
          onCheckIn={(note) => {
            const at = Date.now();
            const id = `local-${at}`;
            dispatch(checkInRecorded({ id, site: "Site A", note, at }));
            queue.enqueue("checkin", { id, note, at });
          }}
        />
      ) : (
        <IncidentsScreen
          onReport={(title, description) =>
            queue.enqueue("incident", { title, description, at: Date.now() })
          }
        />
      )}
      <View style={styles.tabs}>
        <Pressable style={tab === "home" && styles.tabActive} onPress={() => setTab("home")}>
          <Text style={styles.tabText}>Today</Text>
        </Pressable>
        <Pressable
          style={tab === "incidents" && styles.tabActive}
          onPress={() => setTab("incidents")}
        >
          <Text style={styles.tabText}>Incidents</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <CrewOps />
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F8FA", paddingTop: 48 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1A2B4A" },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E5EA" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#1A2B4A" },
  tabText: { padding: 16, fontWeight: "600", color: "#1A2B4A" },
});
