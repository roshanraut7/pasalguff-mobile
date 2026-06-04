import { StyleSheet } from "react-native";
 export default function createPostInsightsDetailStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      height: 58,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerTitle: {
      flex: 1,
      textAlign: "center",
      color: colors.foreground,
      fontSize: 19,
      lineHeight: 26,
      fontFamily: "Poppins_700Bold",
    },

    headerSide: {
      width: 42,
      height: 42,
    },

    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 34,
    },

    previewCard: {
      padding: 14,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    previewTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    previewThumbnail: {
      width: 78,
      height: 78,
      borderRadius: 17,
      backgroundColor: colors.surfaceSecondary,
    },

    previewFallback: {
      width: 78,
      height: 78,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    previewTextWrap: {
      flex: 1,
      minHeight: 78,
      justifyContent: "center",
    },

    previewTitle: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Poppins_700Bold",
    },

    previewMetaRow: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    tagBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
    },

    tagBadgeText: {
      color: colors.accent,
      fontSize: 9,
      lineHeight: 13,
      fontFamily: "Poppins_700Bold",
    },

    communityText: {
      flex: 1,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_500Medium",
    },

    publishedText: {
      marginTop: 5,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      fontFamily: "Poppins_400Regular",
    },

    quickMetricsDivider: {
      marginTop: 14,
      height: 1,
      backgroundColor: colors.border,
    },

    quickMetricsRow: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      gap: 5,
    },

    quickMetricItem: {
      flex: 1,
      alignItems: "center",
      gap: 3,
    },

    quickMetricValue: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
    },

    quickMetricLabel: {
      color: colors.muted,
      fontSize: 9,
      lineHeight: 13,
      fontFamily: "Poppins_400Regular",
    },

    tabsSection: {
      marginTop: 16,
      padding: 4,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },

    tabsListContent: {
      flexGrow: 1,
      justifyContent: "space-between",
    },

    tabContent: {
      marginTop: 22,
    },

    metricCardRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 12,
    },

    metricCard: {
      flex: 1,
      minHeight: 118,
      padding: 14,
      borderRadius: 22,
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    metricIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    metricCardValue: {
      marginTop: 15,
      color: colors.foreground,
      fontSize: 24,
      lineHeight: 30,
      fontFamily: "Poppins_700Bold",
    },

    metricCardLabel: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_500Medium",
    },

    sectionWrap: {
      marginTop: 22,
    },

    sectionTitle: {
      marginBottom: 9,
      marginLeft: 4,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },

    sectionCard: {
      padding: 14,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    infoRow: {
      minHeight: 43,
      paddingHorizontal: 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 15,
    },

    infoLabel: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
    },

    infoValue: {
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
      textAlign: "right",
    },

    infoDivider: {
      height: 1,
      backgroundColor: colors.border,
    },

    progressSection: {
      marginTop: 16,
    },

    progressTrack: {
      width: "100%",
      height: 9,
      borderRadius: 999,
      overflow: "hidden",
      flexDirection: "row",
      backgroundColor: colors.surfaceSecondary,
    },

    neutralProgress: {
      flex: 1,
      backgroundColor: colors.border,
    },

    positiveProgress: {
      backgroundColor: colors.accent,
    },

    negativeProgress: {
      backgroundColor: colors.danger,
    },

    progressLegendRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    positiveDot: {
      backgroundColor: colors.accent,
    },

    negativeDot: {
      backgroundColor: colors.danger,
    },

    legendText: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_500Medium",
    },

    informationBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      backgroundColor: colors.surfaceSecondary,
    },

    informationText: {
      flex: 1,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
    },

    pollQuestion: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "Poppins_700Bold",
    },

    pollMetaRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    pollMetaText: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_500Medium",
    },

    pollStatusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
    },

    closedBadge: {
      opacity: 0.7,
    },

    pollStatusText: {
      color: colors.accent,
      fontSize: 10,
      lineHeight: 14,
      fontFamily: "Poppins_700Bold",
    },

    pollOptionList: {
      marginTop: 18,
      gap: 15,
    },

    pollOption: {
      gap: 7,
    },

    pollOptionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    pollOptionLabel: {
      flex: 1,
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: "Poppins_500Medium",
    },

    pollOptionValue: {
      color: colors.accent,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
    },

    pollTrack: {
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },

    pollFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accent,
    },

    pollClosingText: {
      marginTop: 17,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      fontFamily: "Poppins_400Regular",
    },

    feedbackSummaryText: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 21,
      fontFamily: "Poppins_500Medium",
    },

    emptyFeedbackWrap: {
      minHeight: 146,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },

    emptyFeedbackIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    emptyFeedbackTitle: {
      marginTop: 13,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },
    analyticsFilterRow: {
  marginTop: 16,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
},

analyticsFilterLabel: {
  color: colors.muted,
  fontSize: 12,
  lineHeight: 18,
  fontFamily: "Poppins_500Medium",
},

    emptyFeedbackText: {
      marginTop: 5,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
      textAlign: "center",
    },
  });
}

export type PostInsightsDetailStyles = ReturnType<
  typeof createPostInsightsDetailStyles
>;