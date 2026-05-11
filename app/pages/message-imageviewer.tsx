import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type GalleryImage = {
  uri: string;
  name?: string;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ImageViewerScreen() {
  const { uri, name, images, index } = useLocalSearchParams<{
    uri?: string;
    name?: string;
    images?: string;
    index?: string;
  }>();

  const styles = useMemo(() => createStyles(), []);
  const flatListRef = useRef<FlatList<GalleryImage> | null>(null);

  const galleryImages = useMemo(() => {
    const parsed = parseGalleryImages(images);

    if (parsed.length > 0) {
      return parsed;
    }

    const singleUri = Array.isArray(uri) ? uri[0] : uri;
    const singleName = Array.isArray(name) ? name[0] : name;

    if (!singleUri) return [];

    return [
      {
        uri: singleUri,
        name: singleName || "Image",
      },
    ];
  }, [images, uri, name]);

  const initialIndex = useMemo(() => {
    const rawIndex = Array.isArray(index) ? index[0] : index;
    const parsedIndex = Number(rawIndex ?? 0);

    if (Number.isNaN(parsedIndex)) return 0;

    return Math.min(Math.max(parsedIndex, 0), Math.max(galleryImages.length - 1, 0));
  }, [index, galleryImages.length]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const activeImage = galleryImages[activeIndex];

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / SCREEN_WIDTH);

    setActiveIndex(
      Math.min(Math.max(nextIndex, 0), Math.max(galleryImages.length - 1, 0)),
    );
  };

  if (galleryImages.length === 0) {
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

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {activeImage?.name || "Image"}
          </Text>

          {galleryImages.length > 1 ? (
            <Text style={styles.counterText}>
              {activeIndex + 1} / {galleryImages.length}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={styles.iconButton}
          onPress={() => {
            if (activeImage?.uri) {
              Linking.openURL(activeImage.uri);
            }
          }}
        >
          <Ionicons name="open-outline" size={21} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={galleryImages}
        keyExtractor={(item, itemIndex) => `${item.uri}-${itemIndex}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, itemIndex) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={styles.imagePage}>
            <Image
              source={{ uri: item.uri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function parseGalleryImages(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) return [];

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item?.uri) return null;

        return {
          uri: String(item.uri),
          name: item.name ? String(item.name) : "Image",
        };
      })
      .filter(Boolean) as GalleryImage[];
  } catch {
    return [];
  }
}

function createStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#000",
    },
    header: {
      height: 60,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#000",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    titleWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 8,
    },
    headerTitle: {
      width: "100%",
      textAlign: "center",
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
    },
    counterText: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255,255,255,0.72)",
    },
    imagePage: {
      width: SCREEN_WIDTH,
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