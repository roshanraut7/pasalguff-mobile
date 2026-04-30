// app/user/community-dashboard/(tabs)/_layout.tsx

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function CommunityDashboardTabsLayout() {
  const { colors, isDark } = useAppTheme();

  const tabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: 18,
      right: 18,
      bottom: 18,
      height: 76,
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,

      elevation: 14,
      shadowColor: isDark ? "#000000" : colors.accent,
      shadowOpacity: isDark ? 0.28 : 0.14,
      shadowRadius: 18,
      shadowOffset: {
        width: 0,
        height: 8,
      },
    }),
    [colors, isDark]
  );

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: true,

        header: () => (
          <View
            style={{
              backgroundColor: colors.background,
              paddingTop: 54,
              paddingHorizontal: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => router.back()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={colors.foreground}
                />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 20,
                    fontFamily: "Poppins_700Bold",
                    color: colors.foreground,
                  }}
                >
                  Community Dashboard
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    fontFamily: "Poppins_400Regular",
                    color: colors.muted,
                  }}
                >
                  Manage members, moderators, posts and alerts
                </Text>
              </View>

              <Pressable
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={22}
                  color={colors.foreground}
                />
              </Pressable>
            </View>
          </View>
        ),

        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle,

        tabBarItemStyle: {
          height: 54,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      <Tabs.Screen
        name="member"
        options={{
          title: "Members",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={27}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="moderator"
        options={{
          title: "Moderators",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "shield-checkmark" : "shield-checkmark-outline"}
              size={27}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 33,
                backgroundColor: colors.surfaceTertiary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 32,
                borderWidth: 5,
                borderColor: colors.background,

                elevation: 12,
                shadowColor: isDark ? "#000000" : colors.accent,
                shadowOpacity: isDark ? 0.32 : 0.2,
                shadowRadius: 14,
                shadowOffset: {
                  width: 0,
                  height: 8,
                },
              }}
            >
             <MaterialIcons
          name="dashboard"
          size={30}
          color={focused ? colors.accent : colors.foreground}
        />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="post"
        options={{
          title: "Posts",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "newspaper" : "newspaper-outline"}
              size={27}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={27}
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}