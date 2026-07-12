import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
    Alert,
  Pressable,
  StyleSheet,
    Linking,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { saveImageToGallery } from "@/lib/saveToGallery";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Carousel from "react-native-reanimated-carousel";
import { Image as ExpoImage } from "expo-image";

import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { PostMedia } from "@/types/post";

type PostMediaViewerProps = {
  visible: boolean;
  media: PostMedia[];
  initialIndex?: number;
  onClose: () => void;
};

const ViewerImageSlide = memo(function ViewerImageSlide({ uri }: { uri: string }) {
  return (
    <View style={styles.viewerSlide}>
      <ExpoImage
        source={{ uri }}
        style={styles.viewerSlide}
        contentFit="contain"
        contentPosition="center"
        transition={180}
        cachePolicy="memory-disk"
      />
    </View>
  );
});

export default function PostMediaViewer({
  visible,
  media,
  initialIndex = 0,
  onClose,
}: PostMediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedMedia = useMemo<PostMedia[]>(
    () =>
      [...media]
        .filter((item) => item.type === "IMAGE" && Boolean(item.url))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          ...item,
          url: toAbsoluteFileUrl(item.url) ?? item.url,
        })),
    [media],
  );

  const safeInitialIndex =
    normalizedMedia.length > 0
      ? Math.min(Math.max(initialIndex, 0), normalizedMedia.length - 1)
      : 0;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(safeInitialIndex);
    }
  }, [visible, safeInitialIndex]);

  const handleSave = useCallback(async () => {
  const current = normalizedMedia[currentIndex];
  if (!current?.url || isSaving) return;

  setIsSaving(true);
  try {
    const result = await saveImageToGallery(current.url);
    if (result.success) {
      Alert.alert("Saved", "Image saved to your gallery.");
    } else if (result.reason === "blocked") {
      Alert.alert(
        "Permission needed",
        "Enable photo library access in Settings to save images.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      Alert.alert("Permission needed", "We need permission to save photos.");
    }
  } catch (error) {
    console.log("Save image failed:", error);
    Alert.alert("Couldn't save", "Something went wrong while saving this image.");
  } finally {
    setIsSaving(false);
  }
}, [normalizedMedia, currentIndex, isSaving]);

  const viewerWidth = width;
  const viewerHeight = height * 0.84;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.viewerHeader}>
          <Pressable onPress={onClose} style={styles.viewerHeaderBtn}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>

          <Text style={styles.viewerCounter}>
            {normalizedMedia.length ? currentIndex + 1 : 0}/{normalizedMedia.length}
          </Text>

      <Pressable
  onPress={handleSave}
  disabled={isSaving || normalizedMedia.length === 0}
  style={styles.viewerHeaderBtn}
  hitSlop={8}
>
  <Ionicons
    name={isSaving ? "hourglass-outline" : "download-outline"}
    size={22}
    color="#ffffff"
  />
</Pressable>
        </View>

        <View style={styles.viewerBody}>
          {normalizedMedia.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={42} color="#ffffff" />
              <Text style={styles.emptyStateText}>No images found</Text>
            </View>
          ) : (
            <Carousel
              key={`${visible}-${safeInitialIndex}-${normalizedMedia.length}`}
              defaultIndex={safeInitialIndex}
              loop={normalizedMedia.length > 1}
              enabled={normalizedMedia.length > 1}
              pagingEnabled
              snapEnabled
              width={viewerWidth}
              height={viewerHeight}
              style={{ width: viewerWidth, height: viewerHeight }}
              data={normalizedMedia}
              scrollAnimationDuration={320}
              onSnapToItem={setCurrentIndex}
              renderItem={({ item }) => <ViewerImageSlide uri={item.url} />}
            />
          )}
        </View>

        {normalizedMedia.length > 1 && (
          <View style={styles.viewerDotsRow}>
            {normalizedMedia.slice(0, 8).map((item, index) => (
              <View
                key={item.id ?? `${item.url}-${index}`}
                style={[
                  styles.viewerDot,
                  index === currentIndex && styles.viewerDotActive,
                ]}
              />
            ))}

            {normalizedMedia.length > 8 && (
              <Text style={styles.moreDotsText}>+{normalizedMedia.length - 8}</Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },

  viewerHeader: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewerHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerCounter: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  viewerBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerSlide: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  emptyStateText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  viewerDotsRow: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  viewerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  viewerDotActive: {
    width: 18,
    backgroundColor: "#ffffff",
  },

  moreDotsText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
});