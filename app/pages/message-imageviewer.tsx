import React, { useMemo } from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";

export default function ImageViewerScreen() {
  const { uri, name } = useLocalSearchParams<{
    uri?: string;
    name?: string;
  }>();

  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const imageUri = Array.isArray(uri) ? uri[0] : uri;
  const imageName = Array.isArray(name) ? name[0] : name;

  if (!imageUri) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>

          <Text numberOfLines={1} style={styles.headerTitle}>
            Image
          </Text>

          <View style={styles.iconButton} />
        </View>

        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Image not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        <Text numberOfLines={1} style={styles.headerTitle}>
          {imageName || "Image"}
        </Text>

        <Pressable
          style={styles.iconButton}
          onPress={() => Linking.openURL(imageUri)}
        >
          <Ionicons name="open-outline" size={21} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.imageWrap}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(_colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#000",
    },
    header: {
      height: 56,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(0,0,0,0.95)",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(255,255,255,0.15)",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
      marginHorizontal: 8,
    },
    imageWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000",
    },
    image: {
      width: "100%",
      height: "100%",
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    emptyText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}