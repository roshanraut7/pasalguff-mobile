import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import CreateCommunityForm from "@/components/form/CreateCommunityForm";
import { router } from "expo-router";

export default function AdminCreateCommunityPage() {
  const { colors } = useAppTheme();
    const handleCreateSuccess = () => {
    /**
     * After admin creates a community,
     * send admin back to admin community list tab.
     *
     * This route should match:
     * app/admin/(tabs)/community.tsx
     */
    router.replace("/admin/(tabs)/community");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <CreateCommunityForm submitLabel="Create Community" onSuccess={handleCreateSuccess} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  screen: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 120,
  },
});