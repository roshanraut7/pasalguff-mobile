import AppHeader from "@/components/common/app-header";
import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetMyProfileQuery } from "@/store/api/profileApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
  const [searchValue, setSearchValue] = useState("");
  const { data: session, isPending } = useSession();
  const { colors, isDark } = useAppTheme();

  const { data: profile } = useGetMyProfileQuery(undefined, {
    skip: !session?.user,
  });

  const headerName = useMemo(() => {
    return (
      profile?.name?.trim() ||
      `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
      "User"
    );
  }, [profile]);

  const headerAvatar = toAbsoluteFileUrl(profile?.image);

  const tabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: 20,
      right: 20,
      bottom: 18,
      height: 72,
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      elevation: 10,
      shadowColor: isDark ? "#000000" : colors.accent,
      shadowOpacity: isDark ? 0.22 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    }),
    [colors, isDark]
  );

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => (
          <AppHeader
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            userName={headerName}
            avatarUrl={headerAvatar}
            onAvatarPress={() => router.push("/(tabs)/profile")}
            onFriendsPress={() => router.push("/user/friends")}
            onNotificationPress={() => {}}
          />
        ),
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle,
        tabBarItemStyle: {
          height: 52,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={28}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: focused
                  ? colors.accent
                  : colors.surfaceTertiary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 26,
                borderWidth: 4,
                borderColor: colors.background,
                shadowColor: isDark ? "#000000" : colors.accent,
                shadowOpacity: isDark ? 0.28 : 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Ionicons
                name="add"
                size={28}
                color={focused ? colors.accentForeground : colors.foreground}
              />
            </View>
          ),
        }}
      />

    <Tabs.Screen
  name="messages"
  options={{
    title: "Messages",
    headerShown: false,
    tabBarIcon: ({ focused }) => (
      <Ionicons
        name={focused ? "chatbubble" : "chatbubble-outline"}
        size={24}
        color={focused ? colors.accent : colors.muted}
      />
    ),
  }}
  listeners={{
    tabPress: (e) => {
      e.preventDefault();
      router.push("/messages");
    },
  }}
/>

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}