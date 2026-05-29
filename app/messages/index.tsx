import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import dayjs from "dayjs";
import { useDispatch } from "react-redux";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSession } from "@/api/better-auth-client";
import {
  chatApi,
  type Chat,
  type ChatMessage,
  useGetMyChatsQuery,
} from "@/store/api/chatApi";
import { toAbsoluteFileUrl } from "@/lib/file-url";

const RAW_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_AUTH_URL ?? "";

type UnreadMap = Record<string, number>;

type NewMessagePayload = {
  chatId: string;
  message?: ChatMessage;
  chat?: Chat;
};

function getSocketOrigin() {
  const rawBase = RAW_API_BASE_URL.trim();

  if (!rawBase) return "";

  const cleanedBase = rawBase
    .replace(/\/api\/auth\/?$/i, "")
    .replace(/\/api\/?$/i, "");

  return cleanedBase.endsWith("/") ? cleanedBase.slice(0, -1) : cleanedBase;
}

function sortChatsByUpdatedAt(items: Chat[]) {
  return [...items].sort((a, b) => {
    const bTime = new Date(b.updatedAt).getTime();
    const aTime = new Date(a.updatedAt).getTime();

    return bTime - aTime;
  });
}

function getServerUnreadCount(chat: Chat) {
  const rawUnread =
    (chat as any).unreadCount ??
    (chat as any).unreadMessageCount ??
    (chat as any).unreadMessages ??
    0;

  const count = Number(rawUnread);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function mergeChatsWithLocalUnread(chats: Chat[], localUnread: UnreadMap) {
  return sortChatsByUpdatedAt(chats).map((chat) => {
    const serverUnread = getServerUnreadCount(chat);
    const localCount = localUnread[chat.id] ?? 0;

    return {
      chat,
      unreadCount: Math.max(serverUnread, localCount),
    };
  });
}

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [presenceTick, setPresenceTick] = useState(0);

  const [localChats, setLocalChats] = useState<Chat[]>([]);
  const [localUnread, setLocalUnread] = useState<UnreadMap>({});
 const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

 const {
  data: chats = [],
  isLoading,
  isError,
  refetch,
} = useGetMyChatsQuery();

  useEffect(() => {
    setLocalChats(sortChatsByUpdatedAt(chats));
  }, [chats]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceTick((value) => value + 1);
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const clearUnreadForChat = useCallback((chatId: string) => {
    setLocalUnread((prev) => {
      if (!prev[chatId]) return prev;

      const next = { ...prev };
      delete next[chatId];

      return next;
    });
  }, []);

  const updateChatInstantly = useCallback(
    (payload: NewMessagePayload) => {
      const incomingChatId = payload.chatId;
      const incomingMessage = payload.message;

      if (!incomingChatId) return;

      setLocalChats((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === incomingChatId,
        );

        if (payload.chat) {
          const withoutCurrent = prev.filter(
            (item) => item.id !== incomingChatId,
          );

          return sortChatsByUpdatedAt([payload.chat, ...withoutCurrent]);
        }

        if (existingIndex === -1) {
          void refetch();
          return prev;
        }

        const existingChat = prev[existingIndex];

        const updatedChat: Chat = {
          ...existingChat,
          lastMessage: incomingMessage ?? existingChat.lastMessage ?? null,
          updatedAt: incomingMessage?.createdAt ?? new Date().toISOString(),
        };

        const withoutCurrent = prev.filter(
          (item) => item.id !== incomingChatId,
        );

        return sortChatsByUpdatedAt([updatedChat, ...withoutCurrent]);
      });

      if (incomingMessage && incomingMessage.senderId !== currentUserId) {
        setLocalUnread((prev) => ({
          ...prev,
          [incomingChatId]: (prev[incomingChatId] ?? 0) + 1,
        }));
      }
    },
    [currentUserId, refetch],
  );

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

    const handleNewMessage = async (payload: NewMessagePayload) => {
      if (!mounted) return;

      updateChatInstantly(payload);

      dispatch(
        chatApi.util.invalidateTags([
          { type: "Chat" as const, id: "LIST" },
          { type: "Chat" as const, id: payload.chatId },
          { type: "Message" as const, id: payload.chatId },
        ]),
      );

      try {
        await refetch();
      } catch (error) {
        console.log("Message list refetch failed:", error);
      }

      setPresenceTick((value) => value + 1);
    };

    const handleSoftRefresh = async () => {
      if (!mounted) return;

      try {
        await refetch();
      } catch (error) {
        console.log("Messages list refresh failed:", error);
      }

      setPresenceTick((value) => value + 1);
    };

    socket.on("connect", () => {
      console.log("Messages list socket connected:", socket.id);
    });

    socket.on("connected", (payload) => {
      console.log("Backend socket connected:", payload);
    });

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleSoftRefresh);
    socket.on("chat:read", handleSoftRefresh);
    socket.on("presence:update", handleSoftRefresh);

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
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleSoftRefresh);
      socket.off("chat:read", handleSoftRefresh);
      socket.off("presence:update", handleSoftRefresh);
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();
    };
  }, [currentUserId, refetch, updateChatInstantly, dispatch]);

  const chatRows = useMemo(() => {
    return mergeChatsWithLocalUnread(localChats, localUnread);
  }, [localChats, localUnread]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return chatRows;

    return chatRows.filter(({ chat }) => {
      const name =
        chat.otherUser?.name || chat.otherUser?.businessName || "Unknown User";

      const lastMessage =
        chat.lastMessage?.content || chat.lastMessage?.fileName || "";

      return (
        name.toLowerCase().includes(q) ||
        lastMessage.toLowerCase().includes(q)
      );
    });
  }, [search, chatRows]);
  const handlePullRefresh = useCallback(async () => {
  try {
    setIsPullRefreshing(true);
    await refetch();
  } finally {
    setIsPullRefreshing(false);
  }
}, [refetch]);

  const handleOpenChat = useCallback(
    (chatId: string) => {
      clearUnreadForChat(chatId);
      router.push(`/messages/${chatId}`);
    },
    [clearUnreadForChat],
  );

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
            <SearchField.Group className="rounded-[18px] bg-background px-3 py-2">
              <SearchField.SearchIcon className="px-3" />
              <SearchField.Input placeholder="Search messages" />
              <SearchField.ClearButton className="mr-2 px-2" />
            </SearchField.Group>
          </SearchField>
        </View>

        {isLoading && localChats.length === 0 ? (
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
              <RefreshControl refreshing={isPullRefreshing} onRefresh={handlePullRefresh} />
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
              filteredChats.map(({ chat, unreadCount }, index) => (
                <ConversationRow
                  key={chat.id}
                  chat={chat}
                  unreadCount={unreadCount}
                  styles={styles}
                  showBorder={index !== filteredChats.length - 1}
                  presenceTick={presenceTick}
                  onPress={() => handleOpenChat(chat.id)}
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
  unreadCount,
  styles,
  showBorder,
  presenceTick,
  onPress,
}: {
  chat: Chat;
  unreadCount: number;
  styles: ReturnType<typeof createStyles>;
  showBorder: boolean;
  presenceTick: number;
  onPress: () => void;
}) {
  const name =
    chat.otherUser?.name || chat.otherUser?.businessName || "Unknown User";

  const avatar = getAvatarUrl(name, chat.otherUser?.image);

  const lastMessage = getLastMessagePreview(chat);
  const isUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        showBorder && styles.rowBorder,
        isUnread && styles.rowUnread,
      ]}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatar }} style={styles.avatar} />

        {chat.otherUser?.isOnline ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.rowMiddle}>
        <View style={styles.rowNameLine}>
          <Text
            numberOfLines={1}
            style={[styles.rowName, isUnread && styles.rowNameUnread]}
          >
            {name}
          </Text>

          {chat.otherUser?.isOnline ? (
            <Text style={styles.onlineText}>Online</Text>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.rowMessage, isUnread && styles.rowMessageUnread]}
        >
          {lastMessage}
        </Text>

        <Text numberOfLines={1} style={styles.rowPresence}>
          {formatActiveStatus(chat.otherUser, presenceTick)}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowTime, isUnread && styles.rowTimeUnread]}>
          {formatChatTime(chat.updatedAt)}
        </Text>

        {isUnread ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Text>
          </View>
        ) : chat.lastMessage?.status === "DELIVERED" ? (
          <Ionicons name="checkmark-done" size={16} color="#16a34a" />
        ) : chat.lastMessage ? (
          <Ionicons name="checkmark" size={16} color="#94a3b8" />
        ) : null}
      </View>
    </Pressable>
  );
}

function getLastMessagePreview(chat: Chat) {
  const lastMessage = chat.lastMessage;

  if (!lastMessage) return "No messages yet";

  if (lastMessage.type === "IMAGE") return "📷 Photo";
  if (lastMessage.type === "VIDEO") return "🎥 Video";
  if (lastMessage.type === "AUDIO") return "🎤 Voice message";
  if (lastMessage.type === "FILE") {
    return `📄 ${lastMessage.fileName || "File"}`;
  }

  return lastMessage.content || "Message";
}

function getAvatarUrl(name: string, image?: string | null) {
  const absoluteImage = toAbsoluteFileUrl(image);

  if (absoluteImage) return absoluteImage;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}`;
}

function formatChatTime(value: string) {
  const date = dayjs(value);
  const now = dayjs();

  if (date.isSame(now, "day")) {
    return date.format("hh:mm A");
  }

  if (date.isSame(now.subtract(1, "day"), "day")) {
    return "Yesterday";
  }

  return date.format("D MMM");
}

function formatActiveStatus(
  user?: {
    isOnline?: boolean;
    lastSeenAt?: string | null;
  } | null,
  _tick?: number,
) {
  if (!user) return "Direct message";

  if (user.isOnline) return "Online now";

  if (!user.lastSeenAt) return "Offline";

  const lastSeen = dayjs(user.lastSeenAt);

  if (!lastSeen.isValid()) return "Offline";

  const now = dayjs();

  const diffMinutes = now.diff(lastSeen, "minute");
  const diffHours = now.diff(lastSeen, "hour");
  const diffDays = now.diff(lastSeen, "day");

  if (diffMinutes < 1) return "Active just now";
  if (diffMinutes === 1) return "Active 1m ago";
  if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;

  if (diffHours === 1) return "Active 1h ago";
  if (diffHours < 24) return `Active ${diffHours}h ago`;

  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  return "Offline";
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
      alignItems: "center",
      justifyContent: "center",
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
      paddingHorizontal: 2,
      borderRadius: 16,
    },

    rowUnread: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 8,
      marginHorizontal: -6,
    },

    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    avatarWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceSecondary,
      position: "relative",
    },

    avatar: {
      width: "100%",
      height: "100%",
      borderRadius: 26,
    },

    onlineDot: {
      position: "absolute",
      right: 1,
      bottom: 1,
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.background,
    },

    rowMiddle: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0,
    },

    rowNameLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    rowName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
    },

    rowNameUnread: {
      fontWeight: "900",
    },

    onlineText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.success,
    },

    rowMessage: {
      marginTop: 4,
      fontSize: 13,
      color: colors.muted,
    },

    rowMessageUnread: {
      color: colors.foreground,
      fontWeight: "800",
    },

    rowPresence: {
      marginTop: 3,
      fontSize: 11,
      color: colors.muted,
    },

    rowRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 8,
      marginLeft: 8,
      minWidth: 46,
    },

    rowTime: {
      fontSize: 12,
      color: colors.muted,
    },

    rowTimeUnread: {
      color: colors.accent,
      fontWeight: "800",
    },

    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    unreadBadgeText: {
      color: colors.accentForeground,
      fontSize: 11,
      fontWeight: "900",
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