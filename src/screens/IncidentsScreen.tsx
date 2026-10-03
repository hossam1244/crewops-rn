import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  onReport: (title: string, description: string) => void;
}

/** Report an incident — works fully offline, syncs through the queue. */
export function IncidentsScreen({ onReport }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savedOffline, setSavedOffline] = useState(false);

  const submit = () => {
    if (title.trim().length < 3) return;
    onReport(title.trim(), description.trim());
    setTitle("");
    setDescription("");
    setSavedOffline(true);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>New incident</Text>
      <TextInput
        style={styles.input}
        placeholder="What happened?"
        value={title}
        onChangeText={setTitle}
        accessibilityLabel="Incident title"
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Details (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        accessibilityLabel="Incident description"
      />
      {savedOffline && (
        <Text style={styles.note} accessibilityLabel="Queued offline note">
          Saved offline — it will sync when the network returns.
        </Text>
      )}
      <Pressable
        style={[styles.button, title.trim().length < 3 && styles.disabled]}
        onPress={submit}
        disabled={title.trim().length < 3}
        accessibilityLabel="Report incident"
      >
        <Text style={styles.buttonText}>Report</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8FA", padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E5EA",
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  note: { color: "#2E7D32" },
  button: { backgroundColor: "#1A2B4A", borderRadius: 12, padding: 14, alignItems: "center" },
  disabled: { opacity: 0.4 },
  buttonText: { color: "white", fontWeight: "600" },
});
