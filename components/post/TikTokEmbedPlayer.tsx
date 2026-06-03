import React, {
  memo,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";

import { useAppTheme } from "@/hooks/useAppTheme";

type TikTokEmbedPlayerProps = {
  postId: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  sourceUrl?: string | null;
};

function isSafeTikTokPostId(postId: string) {
  return /^\d{10,30}$/.test(postId);
}

function isAllowedTikTokPlayerNavigation(url: string, postId: string) {
  if (!url || url === "about:blank") {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    return (
      host === "tiktok.com" &&
      parsed.pathname === `/player/v1/${postId}`
    );
  } catch {
    return false;
  }
}

function isTikTokNavigation(url?: string | null) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    return (
      host === "tiktok.com" ||
      host === "m.tiktok.com" ||
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com"
    );
  } catch {
    return false;
  }
}

const TikTokEmbedPlayer = memo(function TikTokEmbedPlayer({
  postId,
  thumbnailUrl,
  title,
  sourceUrl,
}: TikTokEmbedPlayerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);

  if (!isSafeTikTokPostId(postId)) {
    return null;
  }

  const encodedPostId = encodeURIComponent(postId);

  const playerUrl =
    `https://www.tiktok.com/player/v1/${encodedPostId}` +
    "?controls=1" +
    "&description=1" +
    "&music_info=1" +
    "&rel=0" +
    "&autoplay=1";

  /**
   * Use the original public TikTok URL supplied by the backend.
   * The fallback URL still opens a normal TikTok webpage, not an app-store URL.
   */
  const publicWebUrl =
    sourceUrl?.trim() ||
    `https://www.tiktok.com/video/${encodedPostId}`;

  const startInlinePlayback = useCallback(() => {
    setPlayerFailed(false);
    setIsPlaying(true);
  }, []);

  /**
   * Intentionally opens a browser surface, not a private TikTok app scheme.
   * Therefore your code never sends the user to an app download/store URL.
   */
  const openTikTokInBrowser = useCallback(async () => {
    try {
      await WebBrowser.openBrowserAsync(publicWebUrl, {
        presentationStyle:
          WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (error) {
      console.log("Could not open TikTok in browser:", error);
    }
  }, [publicWebUrl]);

  /**
   * Keep the official player inside your card.
   * If TikTok tries to open a profile/video/share/download page from
   * inside the player, stop it replacing the WebView and show the
   * original video webpage in browser view instead.
   */
  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      const requestedUrl = request.url;

      if (isAllowedTikTokPlayerNavigation(requestedUrl, postId)) {
        return true;
      }

      if (isTikTokNavigation(requestedUrl)) {
        void openTikTokInBrowser();
        return false;
      }

      return false;
    },
    [openTikTokInBrowser, postId],
  );

  return (
    <View style={styles.container}>
      <View style={styles.playerFrame}>
        {isPlaying && !playerFailed ? (
          <WebView
            source={{ uri: playerUrl }}
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
              if (isTikTokNavigation(nativeEvent.targetUrl)) {
                void openTikTokInBrowser();
              }
            }}
            renderLoading={() => (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            onError={(event) => {
              console.log("TikTok WebView error:", event.nativeEvent);
              setPlayerFailed(true);
              setIsPlaying(false);
            }}
            onHttpError={(event) => {
              console.log("TikTok WebView HTTP error:", event.nativeEvent);
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play TikTok video inside app"
            onPress={startInlinePlayback}
            style={styles.previewButton}
          >
            {thumbnailUrl?.trim() ? (
              <ExpoImage
                source={{ uri: thumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="logo-tiktok" size={48} color="#ffffff" />
              </View>
            )}

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
        <View style={styles.tiktokBadge}>
          <Ionicons name="logo-tiktok" size={15} color="#ffffff" />
        </View>

        <Text numberOfLines={1} style={styles.title}>
          {title?.trim() || "TikTok video"}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open TikTok video in web browser"
          onPress={() => {
            void openTikTokInBrowser();
          }}
          hitSlop={8}
          style={styles.externalButton}
        >
          <Ionicons name="globe-outline" size={18} color={colors.link} />
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
      aspectRatio: 9 / 14,
      maxHeight: 520,
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

    placeholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#101010",
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
      backgroundColor: "rgba(0,0,0,0.70)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.45)",
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

    tiktokBadge: {
      width: 26,
      height: 22,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000000",
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

export default TikTokEmbedPlayer;