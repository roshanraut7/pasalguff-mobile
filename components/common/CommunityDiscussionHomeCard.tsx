
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar, Surface } from "heroui-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityDiscussion } from "@/store/api/communityDiscussionApi";
import VerifiedBadge from "@/components/common/verifiedBadge";

dayjs.extend(relativeTime);


type AppColors = ReturnType<typeof useAppTheme>["colors"];

type CommunityDiscussionHomeCardProps = {
  discussion: CommunityDiscussion;
};

function getAuthorName(author: CommunityDiscussion["author"]) {
  const fullName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return author.name || fullName || author.businessName || "Unknown user";
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);

  if (!parts.length) return "U";

  if (parts.length === 1) {
    return parts[0]?.charAt(0)?.toUpperCase() || "U";
  }

  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function formatCount(value?: number | null) {
  const count = value ?? 0;

  if (count <= 0) return "0";
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}K`;

  return `${(count / 1_000_000).toFixed(1)}M`;
}

function getStatusTone(
  status: CommunityDiscussion["status"],
  colors: AppColors,
) {
  if (status === "SOLVED") return colors.success;
  if (status === "LOCKED") return colors.danger;
  if (status === "CLOSED") return colors.warning;

  return colors.accent;
}

function getLiveTone(
  status: string | null | undefined,
  colors: AppColors,
) {
  if (status === "LIVE") return colors.danger;
  if (status === "SCHEDULED") return colors.warning;
  if (status === "ENDED") return colors.success;
  if (status === "CANCELLED") return colors.danger;

  return colors.muted;
}

function getLiveLabel(status?: string | null) {
  if (status === "LIVE") return "Live now";
  if (status === "SCHEDULED") return "Scheduled live";
  if (status === "ENDED") return "Live ended";
  if (status === "CANCELLED") return "Live cancelled";

  return "Live chat";
}

function getLiveIcon(status?: string | null) {
  if (status === "LIVE") return "radio" as const;
  if (status === "SCHEDULED") return "calendar-outline" as const;
  if (status === "ENDED") return "checkmark-circle-outline" as const;
  if (status === "CANCELLED") return "close-circle-outline" as const;

  return "chatbubbles-outline" as const;
}

export default function CommunityDiscussionHomeCard({
  discussion,
}: CommunityDiscussionHomeCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const authorName = getAuthorName(discussion.author);

  const authorImage = discussion.author.image
    ? toAbsoluteFileUrl(discussion.author.image) ?? undefined
    : undefined;

  const statusColor = getStatusTone(discussion.status, colors);

  const liveChat = discussion.liveChat ?? null;
  const liveStatus = liveChat?.status ?? null;
  const hasLiveChat = Boolean(liveChat);

  const liveColor = getLiveTone(liveStatus, colors);
  const liveLabel = getLiveLabel(liveStatus);
  const liveIcon = getLiveIcon(liveStatus);

  const isLiveNow = liveStatus === "LIVE";
  const isScheduledLive = liveStatus === "SCHEDULED";

  const openDiscussion = () => {
    router.push({
      pathname: "/discussions/[discussionId]",
      params: {
        discussionId: discussion.id,
        communityId: discussion.communityId,
        communityName: discussion.community.name,
      },
    });
  };

  const openLiveChat = () => {
    router.push({
      pathname: "/discussions/[discussionId]/live",
      params: {
        discussionId: discussion.id,
        communityId: discussion.communityId,
        communityName: discussion.community.name,
      },
    });
  };

  const openPrimary = () => {
    if (hasLiveChat) {
      openLiveChat();
      return;
    }

    openDiscussion();
  };

  const primaryButtonLabel = hasLiveChat
    ? isLiveNow
      ? "Join"
      : "Open Live"
    : "Open";

  return (
    <Pressable onPress={openPrimary}>
      <Surface variant="default" style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.authorRow}>
            <Avatar alt="" size="md" variant="soft" color="accent">
              {authorImage ? (
                <Avatar.Image source={{ uri: authorImage }} />
              ) : null}

              <Avatar.Fallback>{getInitials(authorName)}</Avatar.Fallback>
            </Avatar>

        <View style={styles.authorMeta}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Text numberOfLines={1} style={styles.authorName}>
      {authorName}
    </Text>
    {discussion.author.isVerified ? (
      <VerifiedBadge track={discussion.author.verificationTrack} size={13} />
    ) : null}
  </View>

  <Text numberOfLines={1} style={styles.subMeta}>
    {discussion.community.name} · {dayjs(discussion.createdAt).fromNow()}
  </Text>
</View>
          </View>

        {isLiveNow ? (
  <View style={styles.liveSmallBadge}>
    <View style={styles.liveSmallDot} />
    <Text style={styles.liveSmallText}>LIVE</Text>
  </View>
) : (
  <Pressable
    onPress={(event) => {
      event.stopPropagation();
      openPrimary();
    }}
    style={[
      styles.openButton,
      { backgroundColor: hasLiveChat ? colors.success : colors.success },
    ]}
  >
    <Text style={styles.openButtonText}>Enter</Text>
    <Ionicons name="enter-outline" size={14} color={colors.accentForeground} />
  </Pressable>
)}
        </View>

        {hasLiveChat ? (
  <View style={styles.statusRow}>
    <View style={[styles.liveStatusPill, { borderColor: liveColor }]}>
      <Ionicons name={liveIcon} size={12} color={liveColor} />
      <Text style={[styles.liveStatusText, { color: liveColor }]}>
        {liveLabel}
      </Text>
    </View>
  </View>
) : null}
        <Text numberOfLines={2} style={styles.title}>
          {discussion.title}
        </Text>

        <Text numberOfLines={3} style={styles.body}>
          {discussion.body}
        </Text>

        {hasLiveChat ? (
          <View
            style={[
              styles.liveBox,
              {
                borderColor: liveColor,
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <View
              style={[
                styles.liveIconWrap,
                {
                  backgroundColor: isLiveNow
                    ? colors.danger
                    : colors.surfaceTertiary,
                },
              ]}
            >
              <Ionicons
                name={liveIcon}
                size={19}
                color={isLiveNow ? "#FFFFFF" : liveColor}
              />
            </View>

            <View style={styles.liveContent}>
              <Text
                style={[
                  styles.liveTitle,
                  {
                    color: liveColor,
                  },
                ]}
              >
                {isLiveNow
                  ? "Live chat is running now"
                  : isScheduledLive
                    ? "Live chat is scheduled"
                    : liveLabel}
              </Text>

              <Text numberOfLines={1} style={styles.liveSubtitle}>
                {isLiveNow
                  ? `${formatCount(liveChat?._count?.participants)} watching · ${formatCount(liveChat?._count?.messages)} messages`
                  : isScheduledLive && liveChat?.scheduledAt
                    ? `Starts ${dayjs(liveChat.scheduledAt).fromNow()}`
                    : liveChat?.endedAt
                      ? `Ended ${dayjs(liveChat.endedAt).fromNow()}`
                      : "Open live chat details"}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={15}
              color={colors.muted}
            />

            <Text style={styles.metricText}>
              {formatCount(discussion.answerCount)} answers
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Ionicons name="eye-outline" size={15} color={colors.muted} />

            <Text style={styles.metricText}>
              {formatCount(discussion.viewCount)} views
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Ionicons
              name="notifications-outline"
              size={15}
              color={colors.muted}
            />

            <Text style={styles.metricText}>
              {formatCount(discussion.followerCount)} followers
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 0,
      borderWidth: 0,
      backgroundColor: colors.surface,
      gap: 10,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    authorRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    authorMeta: {
      flex: 1,
      marginLeft: 9,
    },

    authorName: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
    },

    subMeta: {
      marginTop: 1,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    discussionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    discussionBadgeText: {
      color: colors.accent,
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    liveSmallBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#EF4444",
    },

    liveSmallDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: "#FFFFFF",
    },

    liveSmallText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontFamily: "Poppins_800ExtraBold",
    },

    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },

    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.surfaceSecondary,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },

    statusText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    visibilityPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    visibilityText: {
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
    },

    liveStatusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.surfaceSecondary,
    },

    liveStatusText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
    },

    title: {
      color: colors.foreground,
      fontSize: 18,
      lineHeight: 25,
      fontFamily: "Poppins_700Bold",
    },

    body: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Poppins_400Regular",
    },

    liveBox: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    liveIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },

    liveContent: {
      flex: 1,
    },

    liveTitle: {
      fontSize: 13,
      fontFamily: "Poppins_700Bold",
    },

    liveSubtitle: {
      marginTop: 2,
      color: colors.muted,
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
    },

    metricsRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 14,
      paddingTop: 2,
    },

    metricItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    metricText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },

    footerRow: {
      marginTop: 2,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    footerHint: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

 openButton: {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 999,
  borderWidth: 0,
  borderColor: "transparent",
  shadowOpacity: 0,
  shadowColor: "transparent",
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  elevation: 0,
},

    openButtonText: {
      color: colors.accentForeground,
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
    },
  });
}

