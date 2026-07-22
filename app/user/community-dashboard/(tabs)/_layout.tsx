import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, router, useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useGetCommunityDetailsByIdQuery } from "@/store/api/communityApi";
import { useGetMyNotificationsQuery } from "@/store/api/notificationApi";
import { useGetContributorRequestsQuery } from "@/store/api/postApi";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getInitialLetter(name?: string | null) {
  const safeName = name?.trim();
  if (!safeName) return "C";
  return safeName.charAt(0).toUpperCase();
}

// Notification Badge
function NotificationTabIcon({
  focused,
  colors,
  count,
}: {
  focused: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  count: number;
}) {
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", position: "relative" }}>
      <Ionicons
        name={focused ? "notifications" : "notifications-outline"}
        size={24}
        color={focused ? colors.accent : colors.muted}
      />
      {count > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.danger,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        >
          <Text
            style={{
              color: colors.dangerForeground ?? "#fff",
              fontSize: 9,
              fontFamily: "Poppins_700Bold",
            }}
          >
            {displayCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// Requests Badge
function RequestsTabIcon({
  focused,
  colors,
  count,
}: {
  focused: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  count: number;
}) {
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", position: "relative" }}>
      <Ionicons
        name={focused ? "person-add" : "person-add-outline"}
        size={24}
        color={focused ? colors.accent : colors.muted}
      />
      {count > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.danger,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        >
          <Text
            style={{
              color: colors.dangerForeground ?? "#fff",
              fontSize: 9,
              fontFamily: "Poppins_700Bold",
            }}
          >
            {displayCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CommunityDashboardTabsLayout() {
  const { colors, isDark } = useAppTheme();

  const globalParams = useLocalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
    returnTo?: string | string[];
    communityName?: string | string[];
    communityAvatar?: string | string[];
    communityVisibility?: string | string[];
  }>();

  const communityId = getParamValue(globalParams.communityId) || getParamValue(globalParams.id);
  const returnTo = getParamValue(globalParams.returnTo);

  const paramCommunityName = getParamValue(globalParams.communityName);
  const paramCommunityAvatar = getParamValue(globalParams.communityAvatar);
  const paramCommunityVisibility = getParamValue(globalParams.communityVisibility);

  const { data: community, isLoading: isCommunityLoading } = useGetCommunityDetailsByIdQuery(
    communityId,
    { skip: !communityId, refetchOnMountOrArgChange: true }
  );

  const { data: notificationCountResponse } = useGetMyNotificationsQuery(
    { page: 1, limit: 1, communityId },
    { skip: !communityId, pollingInterval: 30000 }
  );

  const notificationUnreadCount = notificationCountResponse?.meta?.unreadCount ?? 0;

  // Prioritize param for instant decision
const shouldShowRequestsTab =
  paramCommunityVisibility?.toUpperCase() === "RESTRICTED";

  const { data: contributorRequestsResponse } = useGetContributorRequestsQuery(
    { communityId, status: "PENDING", page: 1, limit: 1 },
    {
      skip: !communityId || !shouldShowRequestsTab,
      pollingInterval: 30000,
    }
  );

  const pendingContributorRequestCount = contributorRequestsResponse?.meta?.total ?? 0;

  const communityName = community?.name || paramCommunityName || "Community Dashboard";
  const avatarUrl = toAbsoluteFileUrl(community?.avatarImage || paramCommunityAvatar) ?? null;

  const subtitle = useMemo(() => {
    if (community) {
      return `${community.category?.name ?? "Community"} • ${community.visibility}${community.isInstituteCommunity ? " • Institute" : ""}`;
    }
    return paramCommunityVisibility || "Manage members, moderators, posts and alerts";
  }, [community, paramCommunityVisibility]);

  const tabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: 14,
      right: 14,
      bottom: 18,
      height: 72,
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 10,
      elevation: 14,
      shadowColor: isDark ? "#000" : colors.accent,
      shadowOpacity: isDark ? 0.28 : 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    }),
    [colors, isDark]
  );

  const handleBackPress = () => {
    if (returnTo) {
      router.replace(returnTo as any);
    } else {
      router.replace("/(tabs)/profile" as any);
    }
  };

  return (
    <Tabs
  initialRouteName={shouldShowRequestsTab ? "requests" : "index"}
      screenOptions={{
        headerShown: true,
        header: () => (
          <View style={{
            backgroundColor: colors.background,
            paddingTop: 54,
            paddingHorizontal: 18,
            paddingBottom: 18,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Pressable 
                onPress={handleBackPress} 
                style={({ pressed }) => [{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="chevron-back" size={23} color={colors.foreground} />
              </Pressable>

              <View style={{
                width: 44, height: 44, borderRadius: 22, overflow: "hidden",
                backgroundColor: colors.surfaceTertiary,
                borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}>
                {isCommunityLoading && !paramCommunityName ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <Text style={{ color: colors.accent, fontSize: 20, fontFamily: "Poppins_700Bold" }}>
                    {getInitialLetter(communityName)}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text style={{ fontSize: 20, fontFamily: "Poppins_700Bold", color: colors.foreground }} numberOfLines={1}>
                  {communityName}
                </Text>
                <Text style={{ marginTop: 3, fontSize: 13, color: colors.muted }} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            </View>
          </View>
        ),

        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle,
        tabBarItemStyle: { flex: 1, height: 54, alignItems: "center", justifyContent: "center" },
      }}
    >
      <Tabs.Screen name="member" options={{ title: "Members", tabBarIcon: ({ focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={24} color={focused ? colors.accent : colors.muted} /> }} />

      <Tabs.Screen name="students" options={{ title: "Students", href: community?.isInstituteCommunity ? undefined : null, tabBarIcon: ({ focused }) => <Ionicons name={focused ? "school" : "school-outline"} size={24} color={focused ? colors.accent : colors.muted} /> }} />

      <Tabs.Screen name="moderator" options={{ title: "Moderators", tabBarIcon: ({ focused }) => <Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} size={24} color={focused ? colors.accent : colors.muted} /> }} />

      {/* Requests Tab - Always rendered but visibility controlled */}
 <Tabs.Screen
  name="requests"
  options={{
    title: "Requests",
    tabBarButton: shouldShowRequestsTab
      ? undefined
      : () => null,
    tabBarIcon: ({ focused }) => (
      <RequestsTabIcon
        focused={focused}
        colors={colors}
        count={pendingContributorRequestCount}
      />
    ),
  }}
/>
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ focused }) => <MaterialIcons name="dashboard" size={24} color={focused ? colors.accent : colors.muted} /> }} />

      <Tabs.Screen name="post" options={{ title: "Posts", tabBarIcon: ({ focused }) => <Ionicons name={focused ? "newspaper" : "newspaper-outline"} size={24} color={focused ? colors.accent : colors.muted} /> }} />

      <Tabs.Screen name="notifications" options={{ title: "Notifications", tabBarIcon: ({ focused }) => <NotificationTabIcon focused={focused} colors={colors} count={notificationUnreadCount} /> }} />
    </Tabs>
  );
}