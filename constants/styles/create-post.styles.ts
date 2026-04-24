import { StyleSheet } from "react-native";
import type { AppColors } from "@/constants/theme";

export type CreatePostPalette = {
  screen: string;
  card: string;
  soft: string;
  surface: string;
  overlay: string;
  text: string;
  muted: string;
  border: string;
  input: string;
  placeholder: string;
  danger: string;
  divider: string;
  iconSurface: string;
  iconBorder: string;
  badgeBg: string;
  backdrop: string;
  selected: string;
  accent: string;
  accentStrong: string;
  accentForeground: string;
  tabActiveBg: string;
  chipBg: string;
  chipBorder: string;
};

export function getCreatePostPalette(
  colors: AppColors,
  isDark: boolean
): CreatePostPalette {
  return {
    screen: colors.background,
    card: colors.surface,
    soft: isDark ? colors.surfaceSecondary : "#f8fffa",
    surface: colors.surface,
    overlay: colors.overlay,
    text: colors.foreground,
    muted: colors.muted,
    border: colors.border,
    input: isDark ? colors.surfaceSecondary : "#ffffff",
    placeholder: colors.placeholder,
    danger: colors.danger,
    divider: colors.separator,
    iconSurface: isDark
      ? "rgba(15,23,42,0.94)"
      : "rgba(255,255,255,0.96)",
    iconBorder: isDark ? "#22304a" : "#d1fae5",
    badgeBg: isDark ? "rgba(2,6,23,0.84)" : "rgba(255,255,255,0.92)",
    backdrop: colors.backdrop,
    selected: isDark ? "rgba(255,255,255,0.06)" : "#ecfdf3",
    accent: isDark ? colors.surfaceTertiary : colors.accent,
    accentStrong: colors.accent,
    accentForeground: colors.accentForeground,
    tabActiveBg: isDark ? "rgba(248,250,252,0.08)" : "#ecfdf3",
    chipBg: isDark ? colors.surfaceSecondary : "#f8fffa",
    chipBorder: isDark ? "#22304a" : colors.border,
  };
}

export function createCreatePostStyles(p: CreatePostPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: p.screen,
    },

    contentWrap: {
      flex: 1,
      backgroundColor: p.screen,
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.divider,
      backgroundColor: p.screen,
    },
    screenTitle: {
      fontSize: 22,
      fontFamily: "Poppins_600SemiBold",
      color: p.text,
      letterSpacing: 0.2,
    },

    draftsChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 10,
      paddingRight: 8,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: p.chipBg,
      borderWidth: 1,
      borderColor: p.chipBorder,
    },
    draftsChipText: {
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
      color: p.accentStrong,
    },
    draftsCount: {
      minWidth: 22,
      height: 22,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      backgroundColor: p.accent,
    },
    draftsCountText: {
      color: p.accentStrong,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    communityBar: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.divider,
      backgroundColor: p.screen,
    },
    communityBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderWidth: 1,
      borderRadius: 999,
      backgroundColor: p.chipBg,
      borderColor: p.chipBorder,
    },
    communityBtnText: {
      fontSize: 14,
      fontFamily: "Poppins_500Medium",
      maxWidth: 210,
      color: p.text,
    },

    tabBar: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.divider,
      paddingHorizontal: 10,
      paddingTop: 6,
      paddingBottom: 6,
      backgroundColor: p.screen,
      gap: 8,
    },
    tabItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderBottomWidth: 0,
      borderBottomColor: "transparent",
      backgroundColor: "transparent",
    },
    tabLabel: {
      fontSize: 14,
      fontFamily: "Poppins_500Medium",
      color: p.muted,
    },

    composerScroll: {
      flex: 1,
      backgroundColor: p.screen,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 16,
      gap: 16,
    },

    tagsRow: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderWidth: 1,
      borderRadius: 999,
      backgroundColor: p.chipBg,
      borderColor: p.chipBorder,
    },
    tagChipText: {
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: p.text,
    },

    sectionCard: {
      borderWidth: 1,
      borderRadius: 24,
      padding: 15,
      backgroundColor: p.card,
      borderColor: p.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Poppins_600SemiBold",
      color: p.text,
      letterSpacing: 0.15,
    },

    mediaSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    addMoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
      backgroundColor: p.chipBg,
      borderColor: p.chipBorder,
    },
    addMoreBtnText: {
      fontSize: 12,
      color: p.accentStrong,
      fontFamily: "Poppins_500Medium",
    },
    uploadCountText: {
      marginTop: 12,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      color: p.muted,
    },

    linkWrap: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginTop: 12,
      borderColor: p.border,
      backgroundColor: p.input,
    },
    linkInput: {
      fontSize: 15,
      fontFamily: "Poppins_400Regular",
      minHeight: 46,
      color: p.text,
    },

    errorText: {
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      marginTop: 6,
      color: p.danger,
    },

    mediaDropZone: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderRadius: 18,
      paddingVertical: 30,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 12,
      borderColor: p.border,
      backgroundColor: p.soft,
    },
    mediaDropText: {
      fontSize: 14,
      fontFamily: "Poppins_400Regular",
      color: p.muted,
    },

    mediaGrid: {
      marginTop: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
    },
    mediaTile: {
      width: "31.33%",
      marginBottom: 10,
    },
    mediaTileGap: {
      marginRight: "3%",
    },
    mediaPreviewWrap: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 18,
      overflow: "hidden",
      position: "relative",
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.soft,
    },
    mediaImage: {
      width: "100%",
      height: "100%",
    },
    mediaVideoBox: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: p.soft,
    },
    videoText: {
      fontSize: 11,
      fontFamily: "Poppins_500Medium",
      color: p.text,
    },
    mediaActionRow: {
      position: "absolute",
      top: 8,
      right: 8,
      flexDirection: "row",
      gap: 6,
    },
    mediaActionBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.iconSurface,
      borderColor: p.iconBorder,
    },
    mediaBadge: {
      position: "absolute",
      left: 8,
      bottom: 8,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: "80%",
      backgroundColor: p.badgeBg,
      borderColor: p.iconBorder,
    },
    mediaBadgeText: {
      fontSize: 10,
      fontFamily: "Poppins_500Medium",
      color: p.text,
    },

    footerWrap: {
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.divider,
      backgroundColor: p.screen,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
    },

    footerButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      borderWidth: 1,
    },
    footerButtonOutline: {
      backgroundColor: p.surface,
      borderColor: p.border,
    },
    footerButtonSecondary: {
      backgroundColor: p.soft,
      borderColor: p.border,
    },
    footerButtonPrimary: {
      backgroundColor: p.accentStrong,
      borderColor: p.accentStrong,
    },

    footerButtonTextOutline: {
      color: p.text,
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
    },
    footerButtonTextSecondary: {
      color: p.text,
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
    },
    footerButtonTextPrimary: {
      color: p.accentForeground,
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
    },

    buttonDisabled: {
      opacity: 0.55,
    },

    draftsContainer: {
      flex: 1,
      paddingHorizontal: 18,
      paddingTop: 16,
      backgroundColor: p.screen,
    },
    draftsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.divider,
      marginBottom: 8,
    },
    draftPanelTitle: {
      fontSize: 20,
      fontFamily: "Poppins_600SemiBold",
      color: p.text,
    },
    draftPanelSub: {
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      color: p.muted,
    },

    backdrop: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 16,
      backgroundColor: p.backdrop,
    },
    pickerOverlay: {
      maxHeight: "78%",
      borderWidth: 1,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: p.overlay,
      borderColor: p.border,
    },
    pickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    pickerTitle: {
      fontSize: 18,
      fontFamily: "Poppins_600SemiBold",
      color: p.text,
    },
    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.surface,
      borderColor: p.border,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 14,
      height: 50,
      borderWidth: 1,
      borderRadius: 16,
      backgroundColor: p.surface,
      borderColor: p.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Poppins_400Regular",
      color: p.text,
    },
    pickerList: {
      paddingHorizontal: 0,
      paddingBottom: 16,
    },
    communityRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.border,
    },
    communityRowSelected: {
      backgroundColor: p.selected,
    },
    communityAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: p.surface,
      borderColor: p.border,
    },
    communityAvatarImg: {
      width: 42,
      height: 42,
    },
    communityAvatarText: {
      fontSize: 16,
      fontFamily: "Poppins_600SemiBold",
      color: p.muted,
    },
    communityName: {
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
      color: p.text,
    },
    communityMeta: {
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      marginTop: 2,
      color: p.muted,
    },
    communityDesc: {
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      marginTop: 2,
      color: p.muted,
    },
    emptyText: {
      textAlign: "center",
      padding: 24,
      fontSize: 14,
      fontFamily: "Poppins_400Regular",
      color: p.muted,
    },

    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 14,
      borderWidth: 1,
      borderRadius: 16,
      gap: 12,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    tagRowSelected: {
      backgroundColor: p.selected,
      borderColor: p.chipBorder,
    },
    tagLabel: {
      fontSize: 15,
      fontFamily: "Poppins_600SemiBold",
      color: p.text,
    },
    tagDesc: {
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      marginTop: 3,
      lineHeight: 18,
      color: p.muted,
    },
  });
}