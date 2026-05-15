import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchField } from "heroui-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AppHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
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

const TIMING_CONFIG = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
};

export default function AppHeader({
  searchValue,
  onSearchChange,
  userName,
  avatarUrl,
  onAvatarPress,
  notificationCount = 0,
  onFriendsPress,
  onNotificationPress,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchFlex = useSharedValue(0);
  const searchOpacity = useSharedValue(0);

  const safeNotificationCount = Math.max(0, notificationCount);

  const toggleSearch = () => {
    const opening = !isSearchOpen;

    setIsSearchOpen(opening);

    searchFlex.value = withTiming(opening ? 1 : 0, TIMING_CONFIG);
    searchOpacity.value = withTiming(opening ? 1 : 0, TIMING_CONFIG);
  };

  const animatedSearchStyle = useAnimatedStyle(() => ({
    flex: searchFlex.value,
    opacity: searchOpacity.value,
    overflow: "hidden",
  }));

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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Pressable onPress={onAvatarPress}>
          <Avatar
            alt={userName ?? "User"}
            size="sm"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {avatarUrl ? (
              <Avatar.Image key={avatarUrl} source={{ uri: avatarUrl }} />
            ) : null}

            <Avatar.Fallback>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {getInitials(userName)}
              </Text>
            </Avatar.Fallback>
          </Avatar>
        </Pressable>

        <Animated.View style={[{ minWidth: 0 }, animatedSearchStyle]}>
          {isSearchOpen ? (
            <SearchField value={searchValue} onChange={onSearchChange}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input autoFocus />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          ) : null}
        </Animated.View>

        {!isSearchOpen ? <View style={{ flex: 1 }} /> : null}

        <Pressable onPress={toggleSearch} style={{ padding: 4 }}>
          <Ionicons
            name={isSearchOpen ? "close-outline" : "search-outline"}
            size={22}
            color={colors.accent}
          />
        </Pressable>

        <View
          style={{
            width: 1,
            height: 18,
            backgroundColor: colors.border,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Pressable onPress={onFriendsPress} style={{ padding: 4 }}>
            <Ionicons name="people-outline" size={22} color={colors.accent} />
          </Pressable>

          <Pressable
            onPress={onNotificationPress}
            style={{
              padding: 4,
              position: "relative",
            }}
          >
            <Ionicons
              name={
                safeNotificationCount > 0
                  ? "notifications"
                  : "notifications-outline"
              }
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
                  style={{
                    color: "#FFFFFF",
                    fontSize: 9,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  {safeNotificationCount > 99
                    ? "99+"
                    : String(safeNotificationCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}