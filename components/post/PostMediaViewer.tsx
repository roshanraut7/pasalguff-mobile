import React, { memo, useEffect, useMemo, useState } from "react";
import {
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
import type { CommunityPostMedia } from "@/store/api/postApi";

type PostMediaViewerProps = {
  visible: boolean;
  media: CommunityPostMedia[];
  initialIndex?: number;
  onClose: () => void;
};

const ViewerImageSlide = memo(function ViewerImageSlide({
  uri,
}: {
  uri: string;
}) {
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

export default function PostMediaViewer({
  visible,
  media,
  initialIndex = 0,
  onClose,
}: PostMediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const normalizedMedia = useMemo<CommunityPostMedia[]>(
    () =>
      [...media]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({
          ...item,
          url: toAbsoluteFileUrl(item.url) ?? item.url,
        })),
    [media]
  );

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
          <Carousel
            key={`${visible}-${initialIndex}-${normalizedMedia.length}`}
            defaultIndex={initialIndex}
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
            renderItem={({ item, index }) =>
              item.type === "VIDEO" ? (
                <ViewerVideoSlide uri={item.url} active={index === currentIndex} />
              ) : (
                <ViewerImageSlide uri={item.url} />
              )
            }
          />
        </View>

        {normalizedMedia.length > 1 && (
          <View style={styles.viewerDotsRow}>
            {normalizedMedia.map((item, index) => (
              <View
                key={item.id ?? `${item.url}-${index}`}
                style={[
                  styles.viewerDot,
                  index === currentIndex && styles.viewerDotActive,
                ]}
              />
            ))}
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
  viewerDotsRow: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
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
});