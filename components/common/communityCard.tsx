import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import type { CommunityItem } from "@/store/api/communityApi";

type CommunityCardVariant = "explore" | "profile";

type CommunityCardProps = {
  community: CommunityItem;
  variant?: CommunityCardVariant;
  badgeText?: string;
  isActionLoading?: boolean;
  showJoinButton?: boolean;
  onPress?: (community: CommunityItem) => void;
  onPressJoinToggle?: (community: CommunityItem) => void;
};

function isCommunityOwner(community: CommunityItem) {
  return community.myRole === "ADMIN" && community.myMemberStatus === "ACTIVE";
}

function isCommunityJoined(community: CommunityItem) {
  return community.isJoined === true || community.myMemberStatus === "ACTIVE";
}

export default function CommunityCard({
  community,
  variant = "explore",
  badgeText,
  isActionLoading = false,
  showJoinButton = false,
  onPress,
  onPressJoinToggle,
}: CommunityCardProps) {
  const { colors } = useAppTheme();

  const avatarUrl = toAbsoluteFileUrl(community.avatarImage);

  const isOwner = isCommunityOwner(community);
  const isJoined = isCommunityJoined(community);

  const resolvedBadgeText =
    badgeText ?? (isOwner ? "Owner" : isJoined ? "Joined" : undefined);

  const actionLabel = isOwner ? "Owner" : isJoined ? "Joined" : "Join";

  const cardPadding = variant === "profile" ? 14 : 12;
  const avatarSize = variant === "profile" ? 48 : 44;

  return (
    <Pressable
      onPress={() => onPress?.(community)}
      android_ripple={{ color: "transparent" }}
      style={{
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: cardPadding,
        paddingVertical: cardPadding,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: 999,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.segment,
            marginRight: 12,
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={{
                color: colors.accent,
                fontSize: 22,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {community.name?.charAt(0)?.toUpperCase() ?? "C"}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: colors.foreground,
                  fontSize: 16,
                  lineHeight: 22,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {community.name}
              </Text>

              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  marginTop: 1,
                  color: colors.muted,
                  fontSize: 12,
                  lineHeight: 18,
                  fontFamily: "Poppins_400Regular",
                }}
              >
                {(community.memberCount ?? 0).toLocaleString()} members ·{" "}
                {(community.postCount ?? 0).toLocaleString()} posts
              </Text>
            </View>

            {showJoinButton ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={(event) => {
                  event.stopPropagation();
                  onPressJoinToggle?.(community);
                }}
                disabled={isOwner || isActionLoading}
                style={{
                  minWidth: 64,
                  height: 34,
                  paddingHorizontal: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: isJoined ? colors.segment : colors.accent,
                  opacity: isOwner ? 0.85 : 1,
                }}
              >
                {isActionLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      isJoined
                        ? colors.segmentForeground
                        : colors.accentForeground
                    }
                  />
                ) : (
                  <Text
                    style={{
                      color: isJoined
                        ? colors.segmentForeground
                        : colors.accentForeground,
                      fontSize: 12,
                      fontFamily: "Poppins_700Bold",
                    }}
                  >
                    {actionLabel}
                  </Text>
                )}
              </TouchableOpacity>
            ) : resolvedBadgeText ? (
              <View
                style={{
                  minWidth: 62,
                  height: 32,
                  paddingHorizontal: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: colors.segment,
                }}
              >
                <Text
                  style={{
                    color: colors.segmentForeground,
                    fontSize: 12,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  {resolvedBadgeText}
                </Text>
              </View>
            ) : null}
          </View>

          {!!community.description ? (
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{
                marginTop: 8,
                color: colors.muted,
                fontSize: 13,
                lineHeight: 18,
                fontFamily: "Poppins_400Regular",
              }}
            >
              {community.description}
            </Text>
          ) : null}

          {!!community.category?.name ? (
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  marginLeft: 5,
                  color: colors.muted,
                  fontSize: 12,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                {community.category.name} · {community.visibility}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}