import AppHeader from "@/components/common/app-header";
import NotificationModal from "@/components/notification/NotificationModal";
import {
  AppNotification,
  getUnreadNotificationCount,
  useGetMyNotificationsQuery,
} from "@/store/api/notificationApi";
import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useGetMyProfileQuery } from "@/store/api/profileApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { io, type Socket } from "socket.io-client";
import { useDispatch } from "react-redux";

import {
  chatApi,
  type Chat,
  useGetMyChatsQuery,
} from "@/store/api/chatApi";

const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

function getSocketOrigin() {
  const rawBase = RAW_API_BASE_URL.trim();

  if (!rawBase) return "";

  const cleanedBase = rawBase
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "");

  return cleanedBase.endsWith("/") ? cleanedBase.slice(0, -1) : cleanedBase;
}

function getChatUnreadCount(chat: Chat) {
  const rawUnread =
    (chat as any).unreadCount ??
    (chat as any).unreadMessageCount ??
    (chat as any).unreadMessages ??
    0;

  const count = Number(rawUnread);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function getTotalUnreadMessages(chats: Chat[]) {
  return chats.reduce((total, chat) => total + getChatUnreadCount(chat), 0);
}

export default function TabLayout() {
  const [searchValue, setSearchValue] = useState("");
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  const { data: session, isPending } = useSession();
  const currentUserId = session?.user?.id;

  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { data: profile } = useGetMyProfileQuery(undefined, {
    skip: !session?.user,
  });

  const { data: chats = [], refetch: refetchChats } = useGetMyChatsQuery(
    undefined,
    {
      skip: !session?.user,
      pollingInterval: 15000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const unreadMessageCount = useMemo(() => {
    return getTotalUnreadMessages(chats as Chat[]);
  }, [chats]);

  const { data: unreadNotificationResponse } = useGetMyNotificationsQuery(
    {
      page: 1,
      limit: 1,
      unreadOnly: true,
    },
    {
      skip: !session?.user,
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const unreadNotificationCount = getUnreadNotificationCount(
    unreadNotificationResponse,
  );

  useEffect(() => {
    if (!currentUserId) return;

    const socketOrigin = getSocketOrigin();

    if (!socketOrigin) {
      console.log("Tab chat socket origin is missing");
      return;
    }

    let mounted = true;

    const socket: Socket = io(`${socketOrigin}/chat`, {
      transports: ["websocket"],
      auth: {
        userId: currentUserId,
      },
    });

    const refreshChatList = async () => {
      if (!mounted) return;

      dispatch(
        chatApi.util.invalidateTags([{ type: "Chat" as const, id: "LIST" }]),
      );

      try {
        await refetchChats();
      } catch (error) {
        console.log("Tab chat refresh failed:", error);
      }
    };

    socket.on("connect", () => {
      console.log("Tab chat socket connected:", socket.id);
    });

    socket.on("message:new", refreshChatList);
    socket.on("message:delivered", refreshChatList);
    socket.on("chat:read", refreshChatList);
    socket.on("presence:update", refreshChatList);

    socket.on("connect_error", (error) => {
      console.log("Tab chat socket connect error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Tab chat socket disconnected:", reason);
    });

    return () => {
      mounted = false;

      socket.off("connect");
      socket.off("message:new", refreshChatList);
      socket.off("message:delivered", refreshChatList);
      socket.off("chat:read", refreshChatList);
      socket.off("presence:update", refreshChatList);
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();
    };
  }, [currentUserId, dispatch, refetchChats]);

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
      bottom: Math.max(insets.bottom - 16, 8),
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
    [colors, isDark, insets.bottom],
  );

  const renderIconWithBadge = ({
    icon,
    focusedIcon,
    focused,
    size = 24,
    badgeCount = 0,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    focusedIcon: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    size?: number;
    badgeCount?: number;
  }) => {
    const showBadge = badgeCount > 0;

    return (
      <View style={{ position: "relative" }}>
        <Ionicons
          name={focused ? focusedIcon : icon}
          size={size}
          color={focused ? colors.accent : colors.muted}
        />

        {showBadge ? (
          <View
            style={{
              position: "absolute",
              top: -9,
              right: -12,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 5,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.danger,
              borderWidth: 2,
              borderColor: colors.surface,
            }}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 10,
                fontWeight: "800",
              }}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const handleOpenNotification = (notification: AppNotification) => {
    setNotificationModalOpen(false);

    const chatId = notification.data?.chatId
      ? String(notification.data.chatId)
      : undefined;

    const postId = notification.data?.postId;
    const communityId = notification.data?.communityId;

    console.log("Notification pressed:", {
      type: notification.type,
      chatId,
      postId,
      communityId,
    });

    if (chatId) {
      router.push(`/messages/${chatId}`);
      return;
    }

    router.push("/(tabs)");
  };

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
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          header: () => (
            <AppHeader
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              userName={headerName}
              avatarUrl={headerAvatar}
              notificationCount={unreadNotificationCount}
              onAvatarPress={() => router.push("/(tabs)/profile")}
              onFriendsPress={() => router.push("/user/friends")}
              onNotificationPress={() => setNotificationModalOpen(true)}
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
            tabBarIcon: ({ focused }) =>
              renderIconWithBadge({
                icon: "home-outline",
                focusedIcon: "home",
                focused,
              }),
          }}
        />

        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ focused }) =>
              renderIconWithBadge({
                icon: "compass-outline",
                focusedIcon: "compass",
                focused,
                size: 28,
              }),
          }}
        />

        {/* ✅ CHANGED: intercept tab press, open as modal */}
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
                  backgroundColor: colors.surfaceTertiary, // never shows as focused
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
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
                  color={colors.foreground}
                />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // block navigating to create tab
              router.push("/pages/createpost"); // open as modal
            },
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            headerShown: false,
            tabBarIcon: ({ focused }) =>
              renderIconWithBadge({
                icon: "chatbubble-outline",
                focusedIcon: "chatbubble",
                focused,
                badgeCount: unreadMessageCount,
              }),
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
            tabBarIcon: ({ focused }) =>
              renderIconWithBadge({
                icon: "person-outline",
                focusedIcon: "person",
                focused,
              }),
          }}
        />
      </Tabs>

      <NotificationModal
        visible={notificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        onOpenNotification={handleOpenNotification}
      />
    </>
  );
}