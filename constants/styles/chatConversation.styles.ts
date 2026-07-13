import { Platform, StyleSheet } from "react-native";
import type { useAppTheme } from "@/hooks/useAppTheme";

export const COMPOSER_BAR_HEIGHT = 68;

export function createConversationStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      marginTop: 10,
      textAlign: "center",
    },
    emptySubText: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 6,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 14,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    retryText: {
      color: "#ffffff",
      fontWeight: "700",
    },

    header: {
      height: 62,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    avatarWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      position: "relative",
      backgroundColor: colors.surfaceSecondary,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
    },
    onlineDot: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.background,
    },
    headerMeta: {
      flex: 1,
      marginLeft: 10,
    },
    headerName: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.foreground,
    },
    headerStatus: {
      marginTop: 2,
      fontSize: 12,
      color: colors.muted,
    },
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    messagesScroll: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 14,
      paddingTop: 16,
    },
    dateWrap: {
      alignItems: "center",
      marginVertical: 12,
    },
    dateText: {
      fontSize: 12,
      color: colors.muted,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },

    bubbleRow: {
      marginVertical: 4,
      flexDirection: "row",
      // Explicit width + cross-axis alignment. Without these, this row's
      // width depends on being stretched by every single ancestor View
      // in the chain (ScrollView content container -> per-message
      // wrapper -> this row). That chain is fragile — any ancestor that
      // doesn't stretch breaks left/right alignment for one side only,
      // which is exactly the "incoming bubbles drifting toward center"
      // bug. Setting it explicitly here removes the dependency.
      width: "100%",
      alignItems: "flex-end",
    },
    bubbleRowMe: {
      justifyContent: "flex-end",
    },
    bubbleRowOther: {
      justifyContent: "flex-start",
    },
    bubble: {
      // NOTE: the 78%-width cap lives on the wrapping <View> in
      // ConversationScreen.tsx (around senderName + this bubble), not
      // here. Having it in both places means a bubble could compute
      // "78% of 78%", and worse, the inner 78% resolves against a
      // parent whose own width is itself content-based (not fixed) —
      // React Native/Yoga does not reliably lay out a percentage width
      // against an indeterminate parent size. That mismatch is what
      // caused bubbles to render undersized / oddly centered. Keep the
      // cap in exactly one place.
      borderRadius: 18,
      paddingHorizontal: 13,
      paddingVertical: 9,
      // Stops short messages (e.g. "Hello") from being narrower than
      // their own "4:52 PM ✓✓" row, which was causing the timestamp to
      // wrap and clip.
      minWidth: 92,
    },
    bubbleMe: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 6,
    },
    bubbleOther: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 20,
      flexWrap: "wrap",
      flexShrink: 1,
    },

    // Important dark-mode fix:
    // Sent message text should always be white on green bubble.
    bubbleTextMe: {
      color: "#ffffff",
    },
    bubbleTextOther: {
      color: colors.foreground,
    },

    messageImage: {
      width: 220,
      height: 220,
      borderRadius: 14,
    },

    // Removes green/white card behind image bubbles.
    imageBubbleClean: {
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      // IMAGE bubbles don't need the text-message minWidth — undo it so
      // photos aren't force-padded wider than the image itself.
      minWidth: 0,
    },

    imageGridBubble: {
      maxWidth: 240,
      backgroundColor: "transparent",
      borderWidth: 0,
      padding: 0,
    },
    imageGrid: {
      width: 232,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
      borderRadius: 14,
      overflow: "hidden",
    },
    imageGridTwo: {
      width: 232,
    },
    imageGridItem: {
      width: 114,
      height: 114,
      position: "relative",
      backgroundColor: "transparent",
    },
    imageGridItemSingle: {
      width: 232,
      height: 232,
    },
    imageGridItemTwo: {
      width: 114,
      height: 160,
    },
    imageGridImage: {
      width: "100%",
      height: "100%",
    },
    imageGridOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    imageGridOverlayText: {
      color: "#ffffff",
      fontSize: 26,
      fontWeight: "900",
    },
    imageGridTime: {
      marginTop: 5,
      fontSize: 10,
      color: colors.foreground,
      opacity: 0.65,
      alignSelf: "flex-end",
    },

    pendingGridBubble: {
      maxWidth: 250,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 8,
    },
    pendingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    pendingText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "600",
    },

    fileBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      maxWidth: 230,
      minWidth: 180,
    },
    fileIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    fileTextWrap: {
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
    },
    fileNameText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "600",
      flexShrink: 1,
    },
    fileMetaText: {
      marginTop: 2,
      fontSize: 11,
    },
    fileMetaTextMe: {
      color: "#ffffff",
      opacity: 0.75,
    },
    fileMetaTextOther: {
      color: colors.muted,
    },

    messageTime: {
      marginTop: 5,
      fontSize: 10,
      color: colors.muted,
      alignSelf: "flex-end",
      // Stops "4:52 PM" from line-breaking mid-string when the bubble
      // is narrow.
      flexShrink: 0,
    },

    // Important dark-mode fix:
    // Sent message time should also be white.
    messageTimeMe: {
      color: "#ffffff",
      opacity: 0.85,
    },
    messageStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
      marginTop: 5,
      // Keeps the time + checkmark on one line, never wrapping.
      flexWrap: "nowrap",
    },

    composerOuter: {
      position: "absolute",
      left: 0,
      right: 0,
      paddingHorizontal: 12,
    },
    composerWrap: {
      minHeight: COMPOSER_BAR_HEIGHT,
      maxHeight: 140,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 10,
      paddingVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    attachButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      marginBottom: 2,
    },
    inputWrap: {
      flex: 1,
      marginHorizontal: 8,
      minHeight: 42,
      maxHeight: 112,
      borderRadius: 21,
      backgroundColor: colors.surfaceSecondary,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 8 : 4,
    },
    input: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      paddingTop: 0,
      paddingBottom: 0,
      maxHeight: 96,
      textAlignVertical: "top",
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      marginBottom: 2,
    },

    drawerBackdrop: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: "flex-end",
    },
    drawerSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
      paddingBottom: 26,
      paddingHorizontal: 18,
    },
    drawerHandle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 18,
    },
    drawerGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    drawerGridItem: {
      alignItems: "center",
      width: 90,
    },
    drawerGridIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    drawerGridLabel: {
      fontSize: 12,
      color: colors.foreground,
      textAlign: "center",
    },
  });
}

export type ConversationStyles = ReturnType<typeof createConversationStyles>;