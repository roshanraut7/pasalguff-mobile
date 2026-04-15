import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, SearchField } from "heroui-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AppHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  userName?: string | null;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
  onNotificationPress?: () => void;
};

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() || "U";
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

export default function AppHeader({
  searchValue,
  onSearchChange,
  userName,
  avatarUrl,
  onAvatarPress,
  onNotificationPress,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 4,
        paddingHorizontal: 14,
        paddingBottom: 6,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Pressable onPress={onAvatarPress}>
          <Avatar
            alt={userName ?? "User"}
            size="md"
            style={{
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {avatarUrl ? (
              <Avatar.Image
                key={avatarUrl}
                source={{ uri: avatarUrl }}
              />
            ) : null}

            <Avatar.Fallback>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 14,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {getInitials(userName)}
              </Text>
            </Avatar.Fallback>
          </Avatar>
        </Pressable>

        <View style={{ flex: 1 }}>
          <SearchField value={searchValue} onChange={onSearchChange}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </View>

        <Pressable
          onPress={onNotificationPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={19}
            color={COLORS.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}