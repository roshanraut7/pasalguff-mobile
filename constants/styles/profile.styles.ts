import { StyleSheet } from "react-native";
import type { useAppTheme } from "@/hooks/useAppTheme";

export type ProfileColors = ReturnType<typeof useAppTheme>["colors"];

export function createProfileStyles(colors: ProfileColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 120,
      backgroundColor: colors.background,
    },
    page: {
      backgroundColor: colors.background,
    },

    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },

    coverSection: {
      position: "relative",
    },
    coverImage: {
      width: "100%",
      height: 230,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    coverFallback: {
      height: 230,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      overflow: "hidden",
    },
    coverFallbackContent: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 24,
    },
    coverSmallText: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
    },
    coverBigText: {
      color: "#ffffff",
      fontSize: 28,
      lineHeight: 36,
      fontFamily: "Poppins_700Bold",
      marginTop: 6,
    },
    coverActionWrap: {
      position: "absolute",
      right: 20,
      top: 20,
    },
    coverActionButton: {
      height: 42,
      width: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      backgroundColor: "rgba(255,255,255,0.15)",
    },

    avatarFloatingWrap: {
      position: "absolute",
      left: 20,
      bottom: -54,
      width: 116,
      height: 116,
    },
    avatarOuter: {
      width: 116,
      height: 116,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: 999,
      borderWidth: 4,
      borderColor: colors.background,
      backgroundColor: colors.surface,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.segment,
    },
    avatarFallbackText: {
      color: colors.accent,
      fontSize: 36,
      fontFamily: "Poppins_700Bold",
    },
    avatarActionWrap: {
      position: "absolute",
      right: 4,
      bottom: 4,
    },
    avatarActionButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    profileInfoSection: {
      paddingHorizontal: 20,
      paddingTop: 68,
    },
    profileInfoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    profileInfoLeft: {
      width: "78%",
    },
    profileInfoRight: {
      width: "18%",
      alignItems: "flex-end",
    },
    profileName: {
      color: colors.foreground,
      fontSize: 30,
      lineHeight: 38,
      fontFamily: "Poppins_700Bold",
    },
    profileEmail: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: "Poppins_400Regular",
    },
    profileBusinessType: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_500Medium",
    },

    tabsSection: {
      marginTop: 24,
    },
    tabsListContent: {
      flexDirection: "row",
      gap: 20,
      paddingLeft: 20,
      paddingRight: 24,
    },
    tabsBody: {
      paddingTop: 20,
      backgroundColor: colors.background,
    },

    tabPanel: {
      backgroundColor: colors.background,
    },
    paddedPanel: {
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    postsList: {
      marginTop: 8,
    },
    stateWrap: {
      paddingVertical: 32,
    },
    emptyState: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },

    sectionTitle: {
      color: colors.foreground,
      fontSize: 20,
      fontFamily: "Poppins_700Bold",
    },
    sectionText: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Poppins_400Regular",
    },
    sectionHint: {
      marginTop: 16,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_500Medium",
    },
    errorText: {
      marginTop: 8,
      color: colors.danger,
      fontSize: 14,
      fontFamily: "Poppins_500Medium",
    },

    infoList: {
      marginTop: 16,
      rowGap: 12,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderRadius: 18,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    infoIconWrap: {
      marginRight: 12,
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: colors.segment,
    },
    infoTextWrap: {
      width: "84%",
    },
    infoLabel: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },
    infoValue: {
      marginTop: 4,
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: "Poppins_600SemiBold",
    },

    communityList: {
      marginTop: 16,
      rowGap: 12,
    },

    menuButton: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
  });
}

export type ProfileStyles = ReturnType<typeof createProfileStyles>;