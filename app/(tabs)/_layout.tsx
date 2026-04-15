import AppHeader from "@/components/common/app-header";
import { COLORS } from "@/constants/colors";
import { useSession } from "@/api/better-auth-client";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useGetMyProfileQuery } from "@/store/api/profileApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

export default function TabLayout() {
  const [searchValue, setSearchValue] = useState("");
  const { data: session, isPending } = useSession();  
  const { data: profile } = useGetMyProfileQuery();
   const headerName =
  profile?.name?.trim() ||
  `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
  "User";
  const headerAvatar = toAbsoluteFileUrl(profile?.image);


  if (isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
            onNotificationPress={() => { }}
          />
        ),
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 18,
          height: 72,
          backgroundColor: COLORS.card,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 10,
          elevation: 10,
          shadowColor: COLORS.primary,
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
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
              color={focused ? COLORS.primary : COLORS.muted}
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
              size={30}
              color={focused ? COLORS.primary : COLORS.muted}
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
                backgroundColor: focused ? COLORS.primary2 : COLORS.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 26,
                borderWidth: 4,
                borderColor: COLORS.background,
                shadowColor: COLORS.primaryLight,
                shadowOpacity: 0.28,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color={focused ? COLORS.primary : COLORS.muted}
            />
          ),
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
              color={focused ? COLORS.primary : COLORS.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}