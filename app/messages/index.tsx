import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchField } from "heroui-native";
import { io, type Socket } from "socket.io-client";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSession } from "@/api/better-auth-client";
import { type Chat, useGetMyChatsQuery } from "@/store/api/chatApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

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

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const {
    data: chats = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetMyChatsQuery();

  useEffect(() => {
    if (!currentUserId) return;

    const socketOrigin = getSocketOrigin();

    if (!socketOrigin) {
      console.log("Socket origin is missing");
      return;
    }

    let mounted = true;

    const socket: Socket = io(`${socketOrigin}/chat`, {
      transports: ["websocket"],
      auth: {
        userId: currentUserId,
      },
    });

    socket.on("connect", () => {
      console.log("Messages list socket connected:", socket.id);
    });

    socket.on("connected", (payload) => {
      console.log("Backend socket connected:", payload);
    });

    socket.on("message:new", async () => {
      if (!mounted) return;
      await refetch();
    });

    socket.on("message:delivered", async () => {
      if (!mounted) return;
      await refetch();
    });

    socket.on("chat:read", async () => {
      if (!mounted) return;
      await refetch();
    });

    socket.on("connect_error", (error) => {
      console.log("Messages list socket connect error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Messages list socket disconnected:", reason);
    });

    return () => {
      mounted = false;

      socket.off("connect");
      socket.off("connected");
      socket.off("message:new");
      socket.off("message:delivered");
      socket.off("chat:read");
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();
    };
  }, [currentUserId, refetch]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return chats;
    return chats.filter((chat) => {
      const name =
        chat.otherUser?.name || chat.otherUser?.businessName || "Unknown User";

      const lastMessage =
        chat.lastMessage?.content || chat.lastMessage?.fileName || "";

      return (
        name.toLowerCase().includes(q) ||
        lastMessage.toLowerCase().includes(q)
      );
    });
  }, [search, chats]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </Pressable>

          <Text style={styles.title}>Messages</Text>

          <Pressable style={styles.newChatButton}>
            <Ionicons
              name="create-outline"
              size={20}
              color={colors.accentForeground}
            />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>Stay connected with your contacts</Text>

        <View style={styles.searchWrap}>
          <SearchField value={search} onChange={setSearch}>
            <SearchField.Group className="rounded-[18px] bg-field-background px-3 py-2">
              <SearchField.SearchIcon className="px-3" />
              <SearchField.Input placeholder="Search messages" />
              <SearchField.ClearButton className="mr-2 px-2" />
            </SearchField.Group>
          </SearchField>
        </View>

        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator />
            <Text style={styles.emptyText}>Loading messages...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerWrap}>
            <Text style={styles.emptyTitle}>Could not load messages</Text>

            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} />
            }
          >
            {filteredChats.length === 0 ? (
              <View style={styles.centerWrap}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Open a community member profile and press Message.
                </Text>
              </View>
            ) : (
              filteredChats.map((chat, index) => (
                <ConversationRow
                  key={chat.id}
                  chat={chat}
                  styles={styles}
                  showBorder={index !== filteredChats.length - 1}
                  onPress={() => router.push(`/messages/${chat.id}`)}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function ConversationRow({
  chat,
  styles,
  showBorder,
  onPress,
}: {
  chat: Chat;
  styles: ReturnType<typeof createStyles>;
  showBorder: boolean;
  onPress: () => void;
}) {
  const name =
    chat.otherUser?.name || chat.otherUser?.businessName || "Unknown User";

  const avatar = getAvatarUrl(name, chat.otherUser?.image);

  const lastMessage =
    chat.lastMessage?.content ||
    chat.lastMessage?.fileName ||
    "No messages yet";

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, showBorder && styles.rowBorder]}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
      </View>

      <View style={styles.rowMiddle}>
        <Text numberOfLines={1} style={styles.rowName}>
          {name}
        </Text>

        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.rowMessage}>
          {lastMessage}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.rowTime}>{formatChatTime(chat.updatedAt)}</Text>

        {chat.lastMessage?.status === "DELIVERED" ? (
          <Ionicons name="checkmark-done" size={16} color="#16a34a" />
        ) : chat.lastMessage ? (
          <Ionicons name="checkmark" size={16} color="#94a3b8" />
        ) : null}
      </View>
    </Pressable>
  );
}

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);

  if (absoluteImage) return absoluteImage;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}`;
}

function formatChatTime(value: string) {
  const date = new Date(value);

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    newChatButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.foreground,
    },
    subtitle: {
      marginTop: 8,
      fontSize: 14,
      color: colors.muted,
    },
    searchWrap: {
      marginTop: 16,
      marginBottom: 12,
    },
    listContent: {
      paddingBottom: 28,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatarWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    rowMiddle: {
      flex: 1,
      marginLeft: 12,
    },
    rowName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
    },
    rowMessage: {
      marginTop: 4,
      fontSize: 13,
      color: colors.muted,
    },
    rowRight: {
      alignItems: "flex-end",
      gap: 8,
      marginLeft: 8,
    },
    rowTime: {
      fontSize: 12,
      color: colors.muted,
    },
    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
    },
    emptyText: {
      marginTop: 8,
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 14,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    retryText: {
      color: colors.accentForeground,
      fontWeight: "700",
    },
  });
}