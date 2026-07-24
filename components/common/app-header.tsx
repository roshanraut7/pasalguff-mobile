import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AppHeaderProps = {
  userName?: string | null;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
  notificationCount?: number;
  onFriendsPress?: () => void;
  onNotificationPress?: () => void;
};

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || "U";
  }
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

export default function AppHeader({
  userName,
  avatarUrl,
  onAvatarPress,
  notificationCount = 0,
  onFriendsPress,
  onNotificationPress,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const safeNotificationCount = Math.max(0, notificationCount);

  const displayAvatarUrl = useMemo(() => {
    setAvatarLoadFailed(false);
    return toAbsoluteFileUrl(avatarUrl);
  }, [avatarUrl]);

  return (
    <View
      style={{
        paddingTop: insets.top + 4,
        paddingHorizontal: 14,
        paddingBottom: 6,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={onAvatarPress}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {displayAvatarUrl && !avatarLoadFailed ? (
              <Image
                key={displayAvatarUrl}
                source={{ uri: displayAvatarUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {getInitials(userName)}
              </Text>
            )}
          </View>
        </Pressable>

        {/* ⬇️ NEW — tappable fake search bar that navigates to the search screen */}
        <Pressable
          onPress={() => router.push("/search")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.surface,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 13 }}>Search</Text>
        </Pressable>

        <View style={{ width: 1, height: 18, backgroundColor: colors.border }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable onPress={onFriendsPress} style={{ padding: 4 }}>
            <Ionicons name="people-outline" size={22} color={colors.accent} />
          </Pressable>

          <Pressable
            onPress={onNotificationPress}
            style={{ padding: 4, position: "relative" }}
          >
            <Ionicons
              name={safeNotificationCount > 0 ? "notifications" : "notifications-outline"}
              size={22}
              color={colors.accent}
            />
            {safeNotificationCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -3,
                  right: -5,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 999,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.danger,
                  borderWidth: 1,
                  borderColor: colors.background,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: "#FFFFFF", fontSize: 9, fontFamily: "Poppins_700Bold" }}
                >
                  {safeNotificationCount > 99 ? "99+" : String(safeNotificationCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}