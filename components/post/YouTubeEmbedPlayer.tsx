import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { WebView } from "react-native-webview";

import { useAppTheme } from "@/hooks/useAppTheme";

type YouTubeEmbedPlayerProps = {
  videoId: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  sourceUrl?: string | null;
  playbackDisabled?: boolean;
};

/**
 * These values match your app.json:
 * android.package = "com.pasalguff.app"
 * ios.bundleIdentifier = "com.pasalguff.app"
 */
const ANDROID_APP_ID = "com.kamkuro.app";
const IOS_APP_ID = "com.kamkuro.app";

function getAppReferrerOrigin() {
  const appId = Platform.OS === "ios" ? IOS_APP_ID : ANDROID_APP_ID;

  return `https://${appId}`;
}

function isSafeYouTubeId(videoId: string) {
  return /^[a-zA-Z0-9_-]{6,20}$/.test(videoId);
}

function isAllowedEmbedPlayerNavigation(url: string, videoId: string) {
  if (!url || url === "about:blank") {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    const isEmbedHost =
      host === "youtube.com" ||
      host === "youtube-nocookie.com";

    return isEmbedHost && parsed.pathname === `/embed/${videoId}`;
  } catch {
    return false;
  }
}

function isYouTubeNavigation(url?: string | null) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com"
    );
  } catch {
    return false;
  }
}

const YouTubeEmbedPlayer = memo(function YouTubeEmbedPlayer({
  videoId,
  thumbnailUrl,
  title,
  sourceUrl,
  playbackDisabled = false,
}: YouTubeEmbedPlayerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);

  useEffect(() => {
    if (playbackDisabled) {
      setIsPlaying(false);
    }
  }, [playbackDisabled]);

  const isOpeningYouTubeRef = useRef(false);

  if (!isSafeYouTubeId(videoId)) {
    return null;
  }

  const encodedId = encodeURIComponent(videoId);
  const referrerOrigin = getAppReferrerOrigin();

  const previewImage =
    thumbnailUrl?.trim() ||
    `https://i.ytimg.com/vi/${encodedId}/hqdefault.jpg`;

  const watchUrl =
    sourceUrl?.trim() ||
    `https://www.youtube.com/watch?v=${encodedId}`;

  const embedUrl =
    `https://www.youtube.com/embed/${encodedId}` +
    "?playsinline=1" +
    "&rel=0" +
    "&controls=1" +
    "&autoplay=1";

  const startInlinePlayback = useCallback(() => {
    if (playbackDisabled) return;

    setPlayerFailed(false);
    setIsPlaying(true);
  }, [playbackDisabled]);

  const openInYouTubeApp = useCallback(async () => {
    if (isOpeningYouTubeRef.current) {
      return;
    }

    isOpeningYouTubeRef.current = true;

    const nativeAppUrl =
      Platform.OS === "android"
        ? `vnd.youtube://${encodedId}`
        : `youtube://watch?v=${encodedId}`;

    try {
      await Linking.openURL(nativeAppUrl);
    } catch (nativeAppError) {
      try {
        await Linking.openURL(watchUrl);
      } catch (webError) {
        console.log("Could not open YouTube video:", {
          nativeAppError,
          webError,
        });
      }
    } finally {
      setTimeout(() => {
        isOpeningYouTubeRef.current = false;
      }, 800);
    }
  }, [encodedId, watchUrl]);

  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      const requestedUrl = request.url;

      if (isAllowedEmbedPlayerNavigation(requestedUrl, videoId)) {
        return true;
      }

      if (isYouTubeNavigation(requestedUrl)) {
        void openInYouTubeApp();
        return false;
      }

      return false;
    },
    [openInYouTubeApp, videoId],
  );

  return (
    <View style={styles.container}>
      <View style={styles.playerFrame}>
        {isPlaying && !playerFailed && !playbackDisabled ? (
          <WebView
            source={{
              uri: embedUrl,
              headers: {
                Referer: referrerOrigin,
              },
            }}
            style={styles.webView}
            originWhitelist={["https://*"]}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            setSupportMultipleWindows={true}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onOpenWindow={({ nativeEvent }) => {
              if (isYouTubeNavigation(nativeEvent.targetUrl)) {
                void openInYouTubeApp();
              }
            }}
            renderLoading={() => (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            onError={(event) => {
              console.log("YouTube WebView error:", event.nativeEvent);
              setPlayerFailed(true);
              setIsPlaying(false);
            }}
            onHttpError={(event) => {
              console.log("YouTube WebView HTTP error:", event.nativeEvent);
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play YouTube video inside the app"
            onPress={startInlinePlayback}
            disabled={playbackDisabled}
            style={styles.previewButton}
          >
            <ExpoImage
              source={{ uri: previewImage }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />

            <View style={styles.previewOverlay} />

            <View style={styles.playButton}>
              <Ionicons name="play" size={26} color="#ffffff" />
            </View>

            {playerFailed ? (
              <View style={styles.failedLabel}>
                <Text style={styles.failedText}>
                  Video could not play inside the app.
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.youtubeBadge}>
          <Ionicons name="logo-youtube" size={15} color="#ffffff" />
        </View>

        <Text numberOfLines={1} style={styles.title}>
          {title?.trim() || "YouTube video"}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open video in YouTube"
          onPress={() => {
            void openInYouTubeApp();
          }}
          hitSlop={8}
          style={styles.externalButton}
        >
          <Ionicons name="open-outline" size={18} color={colors.link} />
        </Pressable>
      </View>
    </View>
  );
});

type AppColors = ReturnType<typeof useAppTheme>["colors"];

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 12,
      marginTop: 4,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },

    playerFrame: {
      width: "100%",
      aspectRatio: 16 / 9,
      overflow: "hidden",
      backgroundColor: "#000000",
    },

    webView: {
      flex: 1,
      backgroundColor: "#000000",
    },

    loadingWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000000",
    },

    previewButton: {
      width: "100%",
      height: "100%",
      position: "relative",
    },

    thumbnail: {
      width: "100%",
      height: "100%",
    },

    previewOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.22)",
    },

    playButton: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 58,
      height: 58,
      marginLeft: -29,
      marginTop: -29,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 3,
      backgroundColor: "rgba(220,38,38,0.94)",
    },

    failedLabel: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.62)",
    },

    failedText: {
      color: "#ffffff",
      textAlign: "center",
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
    },

    metaRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },

    youtubeBadge: {
      width: 26,
      height: 22,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#dc2626",
    },

    title: {
      flex: 1,
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
    },

    externalButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
  });
}

export default YouTubeEmbedPlayer;