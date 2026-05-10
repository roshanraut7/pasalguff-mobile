import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Carousel from "react-native-reanimated-carousel";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image as ExpoImage } from "expo-image";

import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { PostMedia } from "@/types/post";

type PostMediaViewerProps = {
  visible: boolean;
  media: PostMedia[];
  initialIndex?: number;
  onClose: () => void;
};

function getFileNameFromUrl(uri: string) {
  try {
    const cleanUrl = uri.split("?")[0];
    const name = cleanUrl.split("/").pop();
    return decodeURIComponent(name || "File");
  } catch {
    return "File";
  }
}

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

const ViewerVideoSlide = memo(function ViewerVideoSlide({
  uri,
  active,
}: {
  uri: string;
  active: boolean;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    if (!active) {
      player.pause();
    }
  }, [active, player]);

  return (
    <View style={styles.viewerSlide}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        nativeControls={active}
        contentFit="contain"
        allowsPictureInPicture
      />
    </View>
  );
});

const ViewerFileSlide = memo(function ViewerFileSlide({ uri }: { uri: string }) {
  const fileName = getFileNameFromUrl(uri);

  const openFile = async () => {
    const canOpen = await Linking.canOpenURL(uri);

    if (canOpen) {
      await Linking.openURL(uri);
    }
  };

  return (
    <View style={styles.fileSlide}>
      <View style={styles.fileCard}>
        <View style={styles.fileIconCircle}>
          <Ionicons name="document-text-outline" size={46} color="#ffffff" />
        </View>

        <Text style={styles.fileTitle} numberOfLines={2} ellipsizeMode="middle">
          {fileName}
        </Text>

        <Text style={styles.fileSubtitle}>
          This file cannot be previewed like an image. Tap below to open it.
        </Text>

        <Pressable onPress={openFile} style={styles.openFileButton}>
          <Ionicons name="open-outline" size={18} color="#000000" />
          <Text style={styles.openFileButtonText}>Open file</Text>
        </Pressable>
      </View>
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

  const normalizedMedia = useMemo<PostMedia[]>(
    () =>
      [...media]
        .filter((item) => Boolean(item?.url))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          ...item,
          url: toAbsoluteFileUrl(item.url) ?? item.url,
        })),
    [media]
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

          <View style={styles.viewerHeaderBtn} />
        </View>

        <View style={styles.viewerBody}>
          {normalizedMedia.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={42} color="#ffffff" />
              <Text style={styles.emptyStateText}>No media found</Text>
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
              renderItem={({ item, index }) => {
                if (item.type === "VIDEO") {
                  return (
                    <ViewerVideoSlide
                      uri={item.url}
                      active={index === currentIndex}
                    />
                  );
                }

                if (item.type === "IMAGE") {
                  return <ViewerImageSlide uri={item.url} />;
                }

                return <ViewerFileSlide uri={item.url} />;
              }}
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
  fileSlide: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fileCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  fileIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  fileTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: "100%",
  },
  fileSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  openFileButton: {
    marginTop: 18,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  openFileButtonText: {
    color: "#000000",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
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
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
});